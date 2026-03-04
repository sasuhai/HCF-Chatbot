import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const documents = await prisma.document.findMany({
            orderBy: { createdAt: "desc" }
        })
        return NextResponse.json({ documents })
    } catch (error: any) {
        console.error("Fetch Documents Error:", error)
        return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
    }
}
