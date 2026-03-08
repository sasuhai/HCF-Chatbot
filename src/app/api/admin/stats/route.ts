import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import fs from "fs"
import path from "path"

export async function GET() {
    try {
        const [totalChats, totalMessages, totalLeads, webChats, fbChats, recentActivity, positiveFeedback, negativeFeedback] = await Promise.all([
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
            }),
            prisma.message.count({ where: { feedback: "like" } }),
            prisma.message.count({ where: { feedback: "dislike" } })
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
            totalCost: 0,
            monthlyBudget: 5,
            creditBalance: 0
        }

        return NextResponse.json({
            totalChats,
            totalMessages,
            totalLeads,
            webChats,
            fbChats,
            positiveFeedback,
            negativeFeedback,
            recentActivity: formattedActivity,
            aiUsage,
            runtime: {
                version: process.version,
                platform: process.platform,
                memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
                uptime: Math.round(process.uptime() / 60) + " mins",
                env: process.env.NODE_ENV,
                deployedAt: fs.statSync(path.join(process.cwd(), "package.json")).mtime
            }
        })
    } catch (error) {
        console.error("Stats API Error:", error)
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { budget, balance, reset } = body

        const setting = await prisma.setting.findUnique({
            where: { key: "ai_usage_stats" }
        })

        let stats = {
            totalPromptTokens: 0,
            totalCompletionTokens: 0,
            totalTotalTokens: 0,
            totalCost: 0,
            monthlyBudget: 5,
            creditBalance: 0,
            lastUpdated: new Date()
        }

        if (setting) {
            stats = JSON.parse(setting.value)
        }

        if (budget !== undefined) stats.monthlyBudget = parseFloat(budget)
        if (balance !== undefined) stats.creditBalance = parseFloat(balance)
        if (reset) {
            stats.totalCost = 0
            stats.totalPromptTokens = 0
            stats.totalCompletionTokens = 0
            stats.totalTotalTokens = 0
        }

        await prisma.setting.upsert({
            where: { key: "ai_usage_stats" },
            update: { value: JSON.stringify(stats) },
            create: { key: "ai_usage_stats", value: JSON.stringify(stats) }
        })

        return NextResponse.json({ success: true, stats })
    } catch (error) {
        return NextResponse.json({ error: "Failed to update stats" }, { status: 500 })
    }
}
