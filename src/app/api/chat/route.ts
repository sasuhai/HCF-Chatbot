import { NextRequest } from "next/server"
import { streamText, type ModelMessage } from "ai"
import { openai } from "@ai-sdk/openai"
import { PineconeStore } from "@langchain/pinecone"
import { OpenAIEmbeddings } from "@langchain/openai"
import { Pinecone } from "@pinecone-database/pinecone"
import { prisma } from "@/lib/prisma"
import pdf from "pdf-parse"
import officeParser from "officeparser"

// Initialize clients (these will fail if keys are missing)
const pinecone = new Pinecone()

export async function POST(req: NextRequest) {
    try {
        const { messages, sessionId, conversationId, attachments }: { messages: ModelMessage[], sessionId: string, conversationId?: string, attachments?: any[] } = await req.json()

        // Capture Source (e.g., website URL)
        const host = req.headers.get('host') || "Unknown"
        const referer = req.headers.get('referer') || host

        // --- ATTACHMENTS PROCESSING ---
        let attachmentText = ""
        let imageParts: any[] = []

        if (attachments && attachments.length > 0) {
            for (const att of attachments) {
                const buffer = Buffer.from(att.data, 'base64')

                if (att.type.startsWith('image/')) {
                    imageParts.push({
                        type: 'image',
                        image: att.data
                    })
                } else if (att.type === 'application/pdf') {
                    try {
                        const data = await pdf(buffer)
                        attachmentText += `\n--- ATTACHED PDF (${att.name}) ---\n${data.text}\n`
                    } catch (e) {
                        console.error("PDF Parsing Error:", e)
                    }
                } else if (att.type.includes('word') || att.type.includes('officedocument')) {
                    try {
                        const text = await officeParser.parseOfficeAsync(buffer)
                        attachmentText += `\n--- ATTACHED DOCX (${att.name}) ---\n${text}\n`
                    } catch (e) {
                        console.error("Office Parsing Error:", e)
                    }
                } else if (att.type.startsWith('text/')) {
                    attachmentText += `\n--- ATTACHED TEXT (${att.name}) ---\n${buffer.toString()}\n`
                }
            }
        }
        // --- END ATTACHMENTS PROCESSING ---

        // 1. Identify or Create Conversation
        let currentConvId = conversationId
        if (!currentConvId) {
            const conv = await (prisma.conversation as any).create({
                data: {
                    sessionId,
                    platform: "WEB",
                    source: referer
                }
            })
            currentConvId = conv.id
        }

        // 2. Prepare Vector Search Query
        const lastMsg = messages[messages.length - 1]
        let userQuery = ""
        if (typeof lastMsg.content === "string") {
            userQuery = lastMsg.content
        } else if (Array.isArray(lastMsg.content)) {
            userQuery = lastMsg.content
                .filter((c: any) => c.type === "text")
                .map((c: any) => c.text)
                .join(" ")
        }

        // Add attachment text to context if any
        const queryWithAttachments = `${userQuery} ${attachmentText}`

        // Save last user message to DB
        if (currentConvId) {
            await prisma.message.create({
                data: {
                    conversationId: currentConvId as string,
                    role: "user",
                    content: userQuery + (attachments?.length ? ` [Attached ${attachments.length} files]` : "")
                }
            })
        }

        // 3. Perform Vector Search 
        const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" })
        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!)
        const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex })

        let relevantDocs: any[] = []
        try {
            relevantDocs = await vectorStore.similaritySearch(userQuery, 3)
        } catch (err) {
            console.error("Vector Search Error:", err)
        }

        let context = relevantDocs.map((doc: any) => doc.pageContent).join("\n\n")

        // 4. Fetch Dynamic Settings
        let customPrompt = "You are a professional virtual assistant for Hidayah Centre Foundation."
        try {
            const settings = await prisma.setting.findMany({
                where: { key: { in: ["systemPrompt"] } }
            })
            const promptSetting = settings.find((s: any) => s.key === "systemPrompt")
            if (promptSetting?.value) customPrompt = promptSetting.value
        } catch (err) {
            console.error("Settings Error:", err)
        }

        const finalPrompt = `${customPrompt}
        
STRICT FORMATTING RULES:
1. Use Markdown for all formatting.
2. If giving steps or instructions, ALWAYS use numbered lists (1., 2., 3.).
3. Use bullet points for features or lists.
4. Use double line breaks between paragraphs.
5. Answer based on context if possible.

${attachmentText ? `\n--- ATTACHED CONTENT ---\n${attachmentText}\n--- END ATTACHED CONTENT ---\n` : ""}

CONTEXT:
${context}`

        // 5. Prepare final messages for LLM
        // If there are images, we need to restructure the last message
        const finalMessages = [...messages]
        if (imageParts.length > 0) {
            const lastIdx = finalMessages.length - 1
            const originalContent = typeof finalMessages[lastIdx].content === 'string'
                ? finalMessages[lastIdx].content
                : ""

            finalMessages[lastIdx] = {
                ...finalMessages[lastIdx],
                content: [
                    { type: 'text', text: originalContent as string },
                    ...imageParts
                ]
            }
        }

        // 6. Respond with Stream
        const result = streamText({
            model: openai("gpt-4o-mini"),
            system: finalPrompt,
            messages: finalMessages,
            temperature: 0.2,
            onFinish: async (completion) => {
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
        if (currentConvId) {
            response.headers.set('x-conversation-id', currentConvId as string)
        }
        return response

    } catch (error: any) {
        console.error("Chat API Error:", error)
        return new Response(JSON.stringify({ error: error.message || "An error occurred" }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
}
