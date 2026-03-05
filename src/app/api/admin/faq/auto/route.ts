import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        // Simple logic: Get the most frequent user messages that look like questions
        // Grouping logic for "most common" would ideally use AI, but for now 
        // let's just grab the most common distinct user messages.

        const commonMessages = await prisma.message.groupBy({
            by: ['content'],
            where: {
                role: 'user',
                content: {
                    contains: '?',
                }
            },
            _count: {
                content: true
            },
            orderBy: {
                _count: {
                    content: 'desc'
                }
            },
            take: 5
        })

        const questions = commonMessages.map(m => m.content)

        // Fallback if no history
        if (questions.length === 0) {
            return NextResponse.json({
                questions: ["How to donate?", "Learn about Islam", "Operating hours"]
            })
        }

        return NextResponse.json({ questions })
    } catch (error) {
        console.error("Auto FAQ API Error:", error)
        return NextResponse.json({ error: "Failed to fetch common questions" }, { status: 500 })
    }
}
