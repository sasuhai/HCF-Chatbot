import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const [totalChats, totalMessages, totalLeads, webChats, fbChats, recentActivity] = await Promise.all([
            prisma.conversation.count(),
            prisma.message.count({ where: { role: "assistant" } }),
            prisma.lead.count(),
            prisma.conversation.count({ where: { platform: "WEB" } }),
            prisma.conversation.count({ where: { platform: "FACEBOOK" } }),
            prisma.message.findMany({
                take: 5,
                orderBy: { createdAt: "desc" },
                include: {
                    conversation: {
                        select: { platform: true }
                    }
                }
            })
        ])

        // Format activity to include platform
        const formattedActivity = recentActivity.map(msg => ({
            id: msg.id,
            content: msg.content,
            role: msg.role,
            createdAt: msg.createdAt,
            platform: msg.conversation.platform
        }))

        return NextResponse.json({
            totalChats,
            totalMessages,
            totalLeads,
            webChats,
            fbChats,
            recentActivity: formattedActivity
        })
    } catch (error) {
        console.error("Stats API Error:", error)
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }
}
