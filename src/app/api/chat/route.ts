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
        const { messages, sessionId, conversationId }: { messages: ModelMessage[], sessionId: string, conversationId?: string } = await req.json()

        // Capture Source (e.g., website URL)
        const host = req.headers.get('host') || "Unknown"
        const referer = req.headers.get('referer') || host

        // 1. Identify or Create Conversation
        let currentConvId = conversationId
        if (!currentConvId) {
            const conv = await prisma.conversation.create({
                data: {
                    sessionId,
                    platform: "WEB",
                    source: referer
                }
            })
            currentConvId = conv.id
        }

        // Save last user message to DB
        const lastUserMessage = messages.filter(m => m.role === 'user').pop()
        if (lastUserMessage) {
            await prisma.message.create({
                data: {
                    conversationId: currentConvId,
                    role: "user",
                    content: typeof lastUserMessage.content === 'string' ? lastUserMessage.content : JSON.stringify(lastUserMessage.content)
                }
            })
        }

        // 2. Perform Vector Search to find relevant documents
        const embeddings = new OpenAIEmbeddings({
            model: "text-embedding-3-small",
        })
        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!)
        const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex })

        const lastMsg = messages[messages.length - 1]
        let queryContent = ""
        if (typeof lastMsg.content === "string") {
            queryContent = lastMsg.content
        } else if (Array.isArray(lastMsg.content)) {
            queryContent = lastMsg.content
                .filter((c: any) => c.type === "text")
                .map((c: any) => c.text)
                .join(" ")
        }

        console.log("Chat API: Starting search for query:", queryContent)

        let relevantDocs: any[] = []
        try {
            relevantDocs = await vectorStore.similaritySearch(queryContent, 3)
        } catch (err) {
            console.error("Chat API: Vector Search Error:", err)
        }

        let context = relevantDocs.map((doc: any) => doc.pageContent).join("\n\n")

        // 3. Fetch Dynamic Settings
        let customPrompt = "You are a professional virtual assistant for Hidayah Centre Foundation."
        try {
            const settings = await prisma.setting.findMany({
                where: { key: { in: ["systemPrompt"] } }
            })
            const promptSetting = settings.find((s: any) => s.key === "systemPrompt")
            if (promptSetting?.value) customPrompt = promptSetting.value
        } catch (err) {
            console.error("Chat API: Settings Error:", err)
        }

        const finalPrompt = `${customPrompt}

STRICT FORMATTING RULES:
1. Use Markdown for all formatting.
2. If giving steps or instructions, ALWAYS use numbered lists (1., 2., 3.).
3. Use bullet points for features or lists.
4. Use double line breaks between paragraphs for clarity.
5. Keep sentences concise. 
6. Do not output walls of text.

Answer based on the following context if possible.

CONTEXT:
${context}`

        // 4. Respond with Stream
        const result = streamText({
            model: openai("gpt-4o-mini"),
            system: finalPrompt,
            messages,
            temperature: 0.2,
            onFinish: async (completion) => {
                // Save assistant reply to DB on finish
                await prisma.message.create({
                    data: {
                        conversationId: currentConvId!,
                        role: "assistant",
                        content: completion.text
                    }
                })
            }
        })

        const response = result.toTextStreamResponse()
        response.headers.set('x-conversation-id', currentConvId)
        return response

    } catch (error: any) {
        console.error("Chat API Error:", error)
        return new Response(JSON.stringify({ error: error.message || "An error occurred" }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
}
