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

        // Fetch AI Usage Stats
        const aiUsageSetting = await prisma.setting.findUnique({
            where: { key: "ai_usage_stats" }
        })
        const aiUsage = aiUsageSetting ? JSON.parse(aiUsageSetting.value) : {
            totalPromptTokens: 0,
            totalCompletionTokens: 0,
            totalTotalTokens: 0,
            totalCost: 0
        }

        return NextResponse.json({
            totalChats,
            totalMessages,
            totalLeads,
            webChats,
            fbChats,
            recentActivity: formattedActivity,
            aiUsage,
            runtime: {
                version: process.version,
                platform: process.platform,
                memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
                uptime: Math.round(process.uptime() / 60) + " mins",
                env: process.env.NODE_ENV
            }
        })
    } catch (error) {
        console.error("Stats API Error:", error)
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }
}
