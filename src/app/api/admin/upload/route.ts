import { NextRequest, NextResponse } from "next/server"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { OpenAIEmbeddings } from "@langchain/openai"
import { PineconeStore } from "@langchain/pinecone"
import { Pinecone } from "@pinecone-database/pinecone"
import { prisma } from "@/lib/prisma"
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf"
import OpenAI from "openai"

const pinecone = new Pinecone()
const openai = new OpenAI()

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get("file") as File

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        let rawText = ""
        const fileName = file.name.toLowerCase()
        let fileType = "txt"

        if (fileName.endsWith(".pdf")) fileType = "pdf"
        else if (fileName.endsWith(".png")) fileType = "png"
        else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) fileType = "jpg"

        const title = file.name

        // 1. Process File
        if (fileType === "pdf") {
            try {
                const blob = new Blob([buffer], { type: 'application/pdf' })
                const loader = new WebPDFLoader(blob, { splitPages: false })
                const docs = await loader.load()
                rawText = docs.map(d => d.pageContent).join("\n\n")
            } catch (err: any) {
                return NextResponse.json({ error: `Failed to parse PDF: ${err.message}` }, { status: 400 })
            }
        }
        else if (fileType === "png" || fileType === "jpg") {
            try {
                // Use GPT-4o-mini Vision to describe the image and extract text
                const base64Image = buffer.toString("base64")
                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "Please describe this image in detail and extract any text you see. If it's a document, transcribe it exactly. If it's a photo, describe the scene, the people, and any context relevant to Hidayah Centre Foundation." },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:image/${fileType === "png" ? "png" : "jpeg"};base64,${base64Image}`,
                                    },
                                },
                            ],
                        },
                    ],
                })
                rawText = response.choices[0].message.content || ""
            } catch (err: any) {
                return NextResponse.json({ error: `Image AI scan failed: ${err.message}` }, { status: 400 })
            }
        }
        else {
            // Assume text file
            rawText = buffer.toString("utf-8")
        }

        // Clean up text
        rawText = rawText.replace(/\s+/g, ' ').trim()

        if (!rawText || rawText.length < 20) {
            const errorMsg = fileType === "pdf"
                ? "This PDF appears to be a scanned image (no selectable text found). Please upload the document as a PNG or JPG image instead so the AI can 'see' and read it."
                : "Not enough content found to ingest."
            return NextResponse.json({ error: errorMsg }, { status: 400 })
        }

        // 2. Save Document Record to MySQL (Prisma)
        const document = await prisma.document.create({
            data: {
                title: title,
                sourceUrl: "",
                type: fileType,
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
            [{ source: title, docId: document.id }]
        )

        if (splitDocs.length === 0) {
            throw new Error("Text splitting produced 0 chunks.");
        }

        // 4. Generate Embeddings & Save to Pinecone
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
        console.error("Upload Error:", error)
        return NextResponse.json({ error: error.message || "An error occurred during upload" }, { status: 500 })
    }
}
