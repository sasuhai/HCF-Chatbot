import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search') || ""
        const page = parseInt(searchParams.get('page') || "1")
        const filter = searchParams.get('filter') || ""
        const limit = 20
        const skip = (page - 1) * limit

        // 1. Fetch Conversations with Search & Filter
        const where: any = {}
        const conditions: any[] = []

        if (search) {
            conditions.push({
                messages: {
                    some: { content: { contains: search } }
                }
            })
        }

        if (filter === 'unanswered') {
            conditions.push({
                messages: {
                    some: {
                        role: 'assistant',
                        notAnswered: true
                    }
                }
            })
        }

        if (filter === 'liked') {
            conditions.push({
                messages: {
                    some: {
                        role: 'assistant',
                        feedback: 'like'
                    }
                }
            })
        }

        if (filter === 'disliked') {
            conditions.push({
                messages: {
                    some: {
                        role: 'assistant',
                        feedback: 'dislike'
                    }
                }
            })
        }

        if (conditions.length > 0) {
            where.AND = conditions;
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

        // GET USER-DEFINED EXCLUSIONS FROM DATABASE
        const excludedSetting = await prisma.setting.findUnique({
            where: { key: "excluded_keywords" }
        })
        const userExclusions = excludedSetting ? JSON.parse(excludedSetting.value) as string[] : []

        // Analytics (Restored & Robust)
        const allConvos = await prisma.conversation.findMany({
            where,
            include: { messages: { where: { role: 'user' } } }
        })

        // 1. Source/Platform Distribution
        const sourceMap: Record<string, { count: number, platform: string }> = {}
        allConvos.forEach(c => {
            // Use the specific URL (source) if available, otherwise use platform name
            const displaySource = c.source || (c.platform || 'WEB').toUpperCase()
            if (!sourceMap[displaySource]) {
                sourceMap[displaySource] = { count: 0, platform: c.platform || 'WEB' }
            }
            sourceMap[displaySource].count++
        })
        const sources = Object.entries(sourceMap).map(([name, data]) => ({
            platform: data.platform,
            source: name,
            count: data.count
        }))

        // 2. Popular Keywords
        const commonWords = new Set(['the', 'and', 'for', 'you', 'can', 'with', 'this', 'that', 'your', 'have', 'what', 'saya', 'yang', 'untuk', 'anda', 'dengan', 'saya', 'adalah', 'boleh', 'tidak', 'nama', 'nombor', 'tolong', 'terima', 'kasih', 'bagaimana', 'apa', 'mana', 'siapa'])
        const wordMap: Record<string, number> = {}

        allConvos.forEach(convo => {
            convo.messages.forEach(msg => {
                const words = msg.content.toLowerCase()
                    .replace(/[^\w\s-]|_/g, "")
                    .split(/\s+/)

                words.forEach(word => {
                    if (word.length > 3 && !commonWords.has(word) && !userExclusions.includes(word)) {
                        wordMap[word] = (wordMap[word] || 0) + 1
                    }
                })
            })
        })

        const topWords = Object.entries(wordMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([text, value]) => ({ text, value }))

        return NextResponse.json({
            conversations,
            pagination: {
                total,
                pages: Math.ceil(total / limit) || 1,
                current: page
            },
            analytics: {
                topWords,
                sources
            },
            excludedWords: userExclusions
        })
    } catch (error: any) {
        console.error("Conversations API Error:", error)
        return NextResponse.json({ error: error.message || "Failed to fetch conversations" }, { status: 500 })
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
