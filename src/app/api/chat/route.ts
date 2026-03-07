import { NextRequest } from "next/server"
import { streamText, type ModelMessage } from "ai"
import { openai } from "@ai-sdk/openai"
import { PineconeStore } from "@langchain/pinecone"
import { OpenAIEmbeddings } from "@langchain/openai"
import { Pinecone } from "@pinecone-database/pinecone"
import { prisma } from "@/lib/prisma"
// @ts-ignore
import pdf from "pdf-parse/lib/pdf-parse.js"
import officeParser from "officeparser"
import { logAiUsage } from "@/lib/ai-auditor"
import { extractAndSaveLead } from "@/lib/lead-capture"

// Initialize clients (these will fail if keys are missing)
const pinecone = new Pinecone()

export async function POST(req: NextRequest) {
    try {
        const { messages, sessionId, conversationId, attachments, parentId }: { messages: any[], sessionId: string, conversationId?: string, attachments?: any[], parentId?: string } = await req.json()

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
                        const text = await (officeParser as any).parseOffice(buffer)
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
            const conv = await prisma.conversation.create({
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
                    content: userQuery + (attachments?.length ? ` [Attached ${attachments.length} files]` : ""),
                    parentId: parentId || null
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

        let parentMessageContent = ""
        if (parentId) {
            try {
                const parent = await prisma.message.findUnique({ where: { id: parentId } })
                if (parent) parentMessageContent = parent.content
            } catch (err) {
                console.error("Parent Message Fetch Error:", err)
            }
        }

        const finalPrompt = `${customPrompt}
        
STRICT FORMATTING RULES:
1. Use Markdown for all formatting.
2. If giving steps or instructions, ALWAYS use numbered lists (1., 2., 3.).
3. Use bullet points for features or lists.
4. Use double line breaks between paragraphs.
5. Answer based on context if possible. If the context does not contain the answer, say exactly: "I'm sorry, I don't have enough information in my knowledge base to answer that yet. Would you like to leave your contact details so we can get back to you?"

${parentMessageContent ? `\nUSER IS REPLYING TO THIS MESSAGE: "${parentMessageContent}"\n` : ""}

${attachmentText ? `\n--- ATTACHED CONTENT ---\n${attachmentText}\n--- END ATTACHED CONTENT ---\n` : ""}

CONTEXT:
${context}`

        // 5. Prepare final messages for LLM
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

        // 6. Pre-create assistant message to get an ID for front-end feedback
        const assistantMessage = await prisma.message.create({
            data: {
                conversationId: currentConvId!,
                role: "assistant",
                content: "" // Will be updated onFinish
            }
        })

        // 7. Respond with Stream
        const result = streamText({
            model: openai("gpt-4o-mini"),
            system: finalPrompt,
            messages: finalMessages,
            temperature: 0.2,
            onFinish: async (completion) => {
                try {
                    // Detect if the AI couldn't answer
                    const fallbackPhrase = "I'm sorry, I don't have enough information in my knowledge base to answer that yet"
                    const notAnswered = completion.text.toLowerCase().includes(fallbackPhrase.toLowerCase())

                    // Update message in DB
                    await prisma.message.update({
                        where: { id: assistantMessage.id },
                        data: {
                            content: completion.text,
                            notAnswered: notAnswered
                        }
                    })
                    // Log AI Usage Cost
                    await logAiUsage("gpt-4o-mini", completion.usage)

                    // Background Lead Extraction from the current exchange
                    if (currentConvId) {
                        extractAndSaveLead(userQuery, currentConvId, "WEB").catch(err => console.error("Lead Extraction Background Error:", err))
                    }
                } catch (err) {
                    console.error("Chat API onFinish Error (Critical):", err)
                    // Emergency fallback: at least try to save the content if notAnswered update failed
                    try {
                        await (prisma.message.update as any)({
                            where: { id: assistantMessage.id },
                            data: { content: completion.text }
                        })
                    } catch (innerErr) {
                        console.error("Chat API Emergency Recovery Failed:", innerErr)
                    }
                }
            }
        })

        const response = result.toTextStreamResponse()
        if (currentConvId) {
            response.headers.set('x-conversation-id', currentConvId as string)
            response.headers.set('x-message-id', assistantMessage.id)
        }
        return response

    } catch (error: any) {
        console.error("Chat API Error:", error)
        return new Response(JSON.stringify({ error: error.message || "An error occurred" }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
}
