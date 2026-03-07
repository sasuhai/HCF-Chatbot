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
        const allUserMsgs = await prisma.message.findMany({
            where: { role: 'user' },
            select: { content: true },
            take: 1000,
            orderBy: { createdAt: 'desc' }
        })

        // GET USER-DEFINED EXCLUSIONS FROM DATABASE
        const excludedSetting = await prisma.setting.findUnique({
            where: { key: "excluded_keywords" }
        })
        const userExclusions = excludedSetting ? JSON.parse(excludedSetting.value) as string[] : []

        // COMPREHENSIVE SMART FILTER (English & Malay Stopwords)
        const stopWords = new Set([
            'the', 'and', 'a', 'to', 'of', 'in', 'i', 'is', 'that', 'it', 'on', 'you', 'this', 'for', 'but', 'with', 're', 'how', 'me', 'my', 'can', 'what', 'are', 'was', 'were', 'will', 'did', 'about', 'from', 'have', 'has', 'had', 'been', 'with', 'dont', 'does', 'just', 'more',
            'saya', 'yang', 'ini', 'di', 'ada', 'itu', 'ke', 'untuk', 'dan', 'sebagai', 'boleh', 'tidak', 'kenapa', 'bila', 'nak', 'apa', 'perlu', 'kalau', 'jadi', 'kami', 'dengan', 'saya', 'awak', 'anda', 'mereka', 'kita', 'adalah', 'adalah', 'atau', 'pada', 'sudah', 'telah', 'juga', 'buat', 'mana', 'jika', 'biasa', 'lagi', 'tadi', 'belum', 'nanti', 'ah', 'oh', 'ok', 'okay', 'lah', 'je', 'jer', 'pun'
        ])

        const wordCounts: Record<string, number> = {}

        allUserMsgs.forEach(msg => {
            const words = msg.content.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)

            words.forEach(word => {
                // Filter by length (>2), base stopwords, and user-defined exclusions
                if (word.length > 2 && !stopWords.has(word) && !userExclusions.includes(word)) {
                    wordCounts[word] = (wordCounts[word] || 0) + 1
                }
            })
        })

        const topWords = Object.entries(wordCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 20)
            .map(([text, value]) => ({ text, value }))

        // 3. Platform & Source distribution
        const allConvos = await (prisma.conversation as any).findMany({
            select: { platform: true, source: true },
            take: 1000
        })

        const sourceMap: Record<string, any> = {}
        allConvos.forEach((c: any) => {
            const key = `${c.platform}-${c.source || 'Unknown'}`
            if (!sourceMap[key]) {
                sourceMap[key] = { platform: c.platform, source: c.source || "Unknown", count: 0 }
            }
            sourceMap[key].count++
        })

        const sources = Object.values(sourceMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 50)

        return NextResponse.json({
            conversations,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                current: page
            },
            analytics: {
                topWords,
                sources
            },
            excludedWords: userExclusions // Return this to UI so it knows what's already out
        })
    } catch (error) {
        console.error("Conversations API Error:", error)
        return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
    }
}

// ENDPOINT TO EXCLUDE A WORD
export async function POST(req: Request) {
    try {
        const { word, action } = await req.json()

        if (!word && action !== 'reset') return NextResponse.json({ error: "Word required" }, { status: 400 })

        const setting = await prisma.setting.findUnique({
            where: { key: "excluded_keywords" }
        })

        let words: string[] = setting ? JSON.parse(setting.value) : []

        if (action === 'exclude') {
            if (!words.includes(word)) words.push(word)
        } else if (action === 'include') {
            words = words.filter(w => w !== word)
        } else if (action === 'reset') {
            words = []
        }

        await prisma.setting.upsert({
            where: { key: "excluded_keywords" },
            update: { value: JSON.stringify(words) },
            create: { key: "excluded_keywords", value: JSON.stringify(words) }
        })

        return NextResponse.json({ success: true, count: words.length })
    } catch (error) {
        return NextResponse.json({ error: "Failed to update exclusions" }, { status: 500 })
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
