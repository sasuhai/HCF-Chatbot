import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { OpenAIEmbeddings } from "@langchain/openai"
import { PineconeStore } from "@langchain/pinecone"
import { Pinecone } from "@pinecone-database/pinecone"

const pinecone = new Pinecone()

export async function POST(req: NextRequest) {
    try {
        const { messageId, question, answer } = await req.json()

        if (!messageId || !answer) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // 1. Fetch the original message to get the conversation context if needed
        const assistantMessage = await prisma.message.findUnique({
            where: { id: messageId },
            include: { conversation: true }
        })

        if (!assistantMessage) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 })
        }

        // 2. Update the message in the database with the improved answer
        await prisma.message.update({
            where: { id: messageId },
            data: {
                content: answer,
                notAnswered: false // Mark as resolved/answered
            }
        })

        // 3. Create a new Document for the Knowledge Base to "learn" this
        // We title it with the question for better retrieval match
        const docTitle = `Correction: ${question.substring(0, 50)}${question.length > 50 ? '...' : ''}`
        const docContent = `Question: ${question}\nCorrect Answer: ${answer}`

        const document = await prisma.document.create({
            data: {
                title: docTitle,
                content: docContent,
                type: "correction",
                status: "PROCESSING"
            }
        })

        // 4. Ingest into Vector Store (Pinecone)
        try {
            const textSplitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            })
            const splitDocs = await textSplitter.createDocuments(
                [docContent],
                [{ source: "Manual Correction", docId: document.id, originalQuestion: question }]
            )

            if (splitDocs.length > 0) {
                const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" })
                const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!)
                await PineconeStore.fromDocuments(splitDocs, embeddings, { pineconeIndex })

                await prisma.document.update({
                    where: { id: document.id },
                    data: { status: "COMPLETED" }
                })
            }
        } catch (ingestError) {
            console.error("Failed to ingest correction to Pinecone:", ingestError)
            await prisma.document.update({
                where: { id: document.id },
                data: { status: "FAILED" }
            })
            // We don't return error here because the DB message WAS updated, 
            // but we warn the admin that RAG update failed.
            return NextResponse.json({
                success: true,
                warning: "Answer updated in history, but failed to update AI memory. Please check Knowledge Base status.",
                messageId
            })
        }

        return NextResponse.json({ success: true, messageId })

    } catch (error: any) {
        console.error("Correction API Error:", error)
        return NextResponse.json({ error: error.message || "An error occurred" }, { status: 500 })
    }
}
