import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search') || ""
        const page = parseInt(searchParams.get('page') || "1")
        const limit = 20
        const skip = (page - 1) * limit

        // 1. Fetch Conversations with Search Filter
        const where: any = {}
        if (search) {
            where.messages = {
                some: {
                    content: { contains: search }
                }
            }
        }

        const conversations = await prisma.conversation.findMany({
            where,
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        })

        const total = await prisma.conversation.count({ where })

        // 2. Word Frequency Analysis (on a sample of recent user messages)
        // Note: For large datasets, this should be a cached background task
        const allUserMsgs = await prisma.message.findMany({
            where: { role: 'user' },
            select: { content: true },
            take: 1000,
            orderBy: { createdAt: 'desc' }
        })

        const stopWords = new Set(['the', 'and', 'a', 'to', 'of', 'in', 'i', 'is', 'that', 'it', 'on', 'you', 'this', 'for', 'but', 'with', 're', 'how', 'me', 'my', 'can', 'what', 'saya', 'yang', 'ini', 'di', 'ada', 'itu', 'ke', 'untuk', 'dan', 'sebagai', 'boleh', 'tidak', 'kenapa', 'bila', 'nak', 'apa'])
        const wordCounts: Record<string, number> = {}

        allUserMsgs.forEach(msg => {
            const words = msg.content.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)

            words.forEach(word => {
                if (word.length > 2 && !stopWords.has(word)) {
                    wordCounts[word] = (wordCounts[word] || 0) + 1
                }
            })
        })

        const topWords = Object.entries(wordCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 20)
            .map(([text, value]) => ({ text, value }))

        // 3. Platform & Source distribution
        const platforms = await prisma.conversation.groupBy({
            by: ['platform', 'source'],
            _count: { id: true },
            take: 50
        })

        return NextResponse.json({
            conversations,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                current: page
            },
            analytics: {
                topWords,
                sources: platforms.map(p => ({
                    platform: p.platform,
                    source: p.source || "Unknown",
                    count: p._count.id
                }))
            }
        })
    } catch (error) {
        console.error("Conversations API Error:", error)
        return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        const olderThanStr = searchParams.get('olderThan')

        if (id) {
            // Delete specific convo
            await prisma.conversation.delete({ where: { id } })
            return NextResponse.json({ success: true })
        }

        if (olderThanStr) {
            // Delete old data (maintenance)
            const date = new Date()
            date.setDate(date.getDate() - parseInt(olderThanStr))

            const result = await prisma.conversation.deleteMany({
                where: { createdAt: { lt: date } }
            })
            return NextResponse.json({ success: true, count: result.count })
        }

        return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    } catch (error) {
        console.error("Delete Conversations Error:", error)
        return NextResponse.json({ error: "Failed to delete data" }, { status: 500 })
    }
}
