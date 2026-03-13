import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { logAiUsage } from "@/lib/ai-auditor"

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const forceRefresh = searchParams.get("refresh") === "true"

        // 1. Check for cached data first
        if (!forceRefresh) {
            const cache = await prisma.setting.findUnique({
                where: { key: "popular_questions_cache" }
            })

            if (cache) {
                const cacheData = JSON.parse(cache.value)
                return NextResponse.json({
                    questions: cacheData,
                    cached: true,
                    lastUpdated: cache.updatedAt
                })
            }
        }

        // 2. Refresh Logic: Fetch user messages (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const userMessages = await prisma.message.findMany({
            where: {
                role: "user",
                createdAt: { gte: thirtyDaysAgo }
            },
            select: { content: true },
            take: 1000,
            orderBy: { createdAt: "desc" }
        })

        if (userMessages.length === 0) {
            return NextResponse.json({ questions: [] })
        }

        const messageList = userMessages.map(m => m.content).join("\n")

        const prompt = `
            Analyze the following list of user questions/messages from a chatbot.
            Group similar questions together and provide a count for each group.
            Combine questions that have the same intent.
            
            Return the result as a JSON array of objects with 'question' (a representative summary) and 'count' fields.
            Order by count descending. Top 10 only.
            
            USER MESSAGES:
            ${messageList}
        `

        // 3. Generate with temperature 0 for stability
        const { text, usage } = await generateText({
            model: openai("gpt-4.1-mini"),
            prompt: prompt,
            temperature: 0
        })

        // Log Usage
        await logAiUsage("gpt-4.1-mini", usage)

        let questions = []
        try {
            const match = text.match(/\[[\s\S]*\]/)
            if (match) {
                questions = JSON.parse(match[0])
            }
        } catch (e) {
            console.error("Failed to parse AI response:", e)
        }

        // 4. Update the cache in DB
        if (questions.length > 0) {
            await prisma.setting.upsert({
                where: { key: "popular_questions_cache" },
                update: { value: JSON.stringify(questions) },
                create: { key: "popular_questions_cache", value: JSON.stringify(questions) }
            })
        }

        return NextResponse.json({ questions, cached: false, lastUpdated: new Date() })
    } catch (error) {
        console.error("Popular Questions API Error:", error)
        return NextResponse.json({ error: "Failed to compile questions" }, { status: 500 })
    }
}
