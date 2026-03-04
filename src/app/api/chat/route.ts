import { NextRequest } from "next/server"
import { streamText, type ModelMessage } from "ai"
import { openai } from "@ai-sdk/openai"
import { PineconeStore } from "@langchain/pinecone"
import { OpenAIEmbeddings } from "@langchain/openai"
import { Pinecone } from "@pinecone-database/pinecone"
import { prisma } from "@/lib/prisma"

// Initialize clients (these will fail if keys are missing)
const pinecone = new Pinecone()

export async function POST(req: NextRequest) {
    try {
        const { messages }: { messages: ModelMessage[] } = await req.json()

        // 2. Perform Vector Search to find relevant documents
        const embeddings = new OpenAIEmbeddings({
            model: "text-embedding-3-small", // ensure it matches ingestion model
        })
        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!)
        const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex })

        // Get the last user message to search
        const lastMessage = messages[messages.length - 1]

        let queryContent = ""
        if (typeof lastMessage.content === "string") {
            queryContent = lastMessage.content
        } else if (Array.isArray(lastMessage.content)) {
            queryContent = lastMessage.content
                .filter((c: any) => c.type === "text")
                .map((c: any) => c.text)
                .join(" ")
        }

        const relevantDocs = await vectorStore.similaritySearch(queryContent, 3)

        // Format context
        let context = relevantDocs.map((doc: any) => doc.pageContent).join("\n\n")

        // 3. Fetch Dynamic Settings
        const settings = await prisma.setting.findMany({
            where: {
                key: { in: ["systemPrompt"] }
            }
        })
        const customPrompt = settings.find(s => s.key === "systemPrompt")?.value ||
            "You are a helpful assistant for Hidayah Centre Foundation."

        // Construct the prompt with context
        const finalPrompt = `${customPrompt}
        
Answer based on the following context if possible. If not in context, use your general knowledge but mention you are an HCF assistant.

CONTEXT:
${context}`

        // 4. Track Analytics (Optional: create a conversation entry if it doesn't exist)
        // For simplicity, we'll just log that a message happened
        // In a real app, you'd pass a conversationId from the frontend

        // Call the language model
        const result = streamText({
            model: openai("gpt-4o-mini"),
            system: finalPrompt,
            messages,
            temperature: 0.2,
        })

        // Respond with the stream
        return result.toTextStreamResponse()

    } catch (error: any) {
        console.error("Chat API Error:", error)
        return new Response(JSON.stringify({ error: error.message || "An error occurred" }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
}
