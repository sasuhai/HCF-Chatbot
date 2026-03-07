import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const leads = await prisma.lead.findMany({
            orderBy: { createdAt: 'desc' },
            include: { conversation: { include: { messages: { orderBy: { createdAt: 'asc' } } } } }
        })
        return NextResponse.json({ leads })
    } catch (error) {
        console.error("Leads API Error:", error)
        return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (id) {
            await prisma.lead.delete({ where: { id } })
            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: "Missing ID" }, { status: 400 })
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 })
    }
}
