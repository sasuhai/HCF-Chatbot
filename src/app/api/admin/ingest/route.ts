import { NextRequest, NextResponse } from "next/server"
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { OpenAIEmbeddings } from "@langchain/openai"
import { PineconeStore } from "@langchain/pinecone"
import { Pinecone } from "@pinecone-database/pinecone"
import { prisma } from "@/lib/prisma"
import * as cheerio from "cheerio"

const pinecone = new Pinecone()

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { type, content, title } = body

        if (!type || !content) {
            return NextResponse.json({ error: "Missing type or content" }, { status: 400 })
        }

        let rawText = ""
        let sourceUrl = ""

        // 1. Load Data
        if (type === "url") {
            const isSitemap = content.toLowerCase().endsWith(".xml");

            if (isSitemap) {
                try {
                    const response = await fetch(content);
                    const xml = await response.text();
                    const $ = cheerio.load(xml, { xmlMode: true });

                    const urls: string[] = [];
                    // Handle both sitemapindex and urlset
                    $("loc").each((_, el) => {
                        const url = $(el).text().trim();
                        if (url && (url.startsWith("http"))) {
                            urls.push(url);
                        }
                    });

                    if (urls.length === 0) {
                        return NextResponse.json({ error: "No valid URLs found in the sitemap." }, { status: 400 });
                    }

                    // For index sitemaps, we skip sub-xml files for now and focus on page URLs.
                    const pagesToScrape = urls.filter(u => !u.endsWith(".xml")).slice(0, 50);

                    if (pagesToScrape.length === 0 && urls.some(u => u.endsWith(".xml"))) {
                        return NextResponse.json({ error: "This is a sitemap index. Please provide a specific page sitemap (e.g., page-sitemap.xml)." }, { status: 400 });
                    }

                    // Process each page
                    for (const url of pagesToScrape) {
                        try {
                            const loader = new CheerioWebBaseLoader(url);
                            const docs = await loader.load();
                            const pageText = docs.map(d => d.pageContent).join("\n\n").replace(/\s+/g, ' ').trim();

                            if (pageText.length < 50) continue;

                            // Create record in DB
                            const pDoc = await prisma.document.create({
                                data: {
                                    title: url,
                                    sourceUrl: url,
                                    type: "url",
                                    content: pageText,
                                    status: "PROCESSING"
                                }
                            });

                            // Embed and Upsert
                            const textSplitter = new RecursiveCharacterTextSplitter({
                                chunkSize: 1000,
                                chunkOverlap: 200,
                            });
                            const splitDocs = await textSplitter.createDocuments(
                                [pageText],
                                [{ source: url, docId: pDoc.id }]
                            );

                            if (splitDocs.length > 0) {
                                const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
                                const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);
                                await PineconeStore.fromDocuments(splitDocs, embeddings, { pineconeIndex });

                                await prisma.document.update({
                                    where: { id: pDoc.id },
                                    data: { status: "COMPLETED" }
                                });
                            } else {
                                await prisma.document.update({
                                    where: { id: pDoc.id },
                                    data: { status: "FAILED" }
                                });
                            }
                        } catch (pageErr) {
                            console.error(`Error scraping ${url}:`, pageErr);
                        }
                    }

                    return NextResponse.json({ success: true, count: pagesToScrape.length, message: `Successfully processed ${pagesToScrape.length} pages.` });
                } catch (err: any) {
                    return NextResponse.json({ error: `Failed to process Sitemap: ${err.message}` }, { status: 400 });
                }
            } else {
                try {
                    // Use Cheerio to scrape the single URL
                    const loader = new CheerioWebBaseLoader(content)
                    const docs = await loader.load()
                    rawText = docs.map(d => d.pageContent).join("\n\n")
                    sourceUrl = content
                } catch (err: any) {
                    return NextResponse.json({ error: `Failed to scrape URL: ${err.message}` }, { status: 400 })
                }
            }
        } else if (type === "text") {
            rawText = content
        } else {
            return NextResponse.json({ error: "Unsupported ingestion type" }, { status: 400 })
        }

        // Clean up text
        rawText = rawText.replace(/\s+/g, ' ').trim()

        if (!rawText || rawText.length < 50) {
            return NextResponse.json({ error: "Not enough content found to ingest." }, { status: 400 })
        }

        // 2. Save Document Record to MySQL (Prisma)
        const document = await prisma.document.create({
            data: {
                title: title || (type === "url" ? content : "Uploaded Text"),
                sourceUrl,
                type: type === "url" ? "url" : "txt",
                content: rawText,
                status: "PROCESSING"
            }
        })

        // 3. Split Text into Chunks
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        })
        const splitDocs = await textSplitter.createDocuments(
            [rawText],
            [{ source: sourceUrl, docId: document.id }]
        )

        // 4. Generate Embeddings & Save to Pinecone
        if (splitDocs.length === 0) {
            throw new Error("Text splitting produced 0 chunks.");
        }

        const embeddings = new OpenAIEmbeddings({
            model: "text-embedding-3-small",
        })
        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!)

        await PineconeStore.fromDocuments(splitDocs, embeddings, {
            pineconeIndex,
        })

        // 5. Update Status in MySQL
        await prisma.document.update({
            where: { id: document.id },
            data: { status: "COMPLETED" }
        })

        return NextResponse.json({ success: true, document })

    } catch (error: any) {
        console.error("Ingestion Error:", error)
        return NextResponse.json({ error: error.message || "An error occurred during ingestion" }, { status: 500 })
    }
}
