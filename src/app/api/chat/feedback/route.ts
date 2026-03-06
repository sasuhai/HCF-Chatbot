import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
    try {
        const { messageId, feedback } = await req.json()

        if (!messageId || !feedback) {
            return NextResponse.json({ error: "Missing messageId or feedback" }, { status: 400 })
        }

        if (!['like', 'dislike'].includes(feedback)) {
            return NextResponse.json({ error: "Invalid feedback type" }, { status: 400 })
        }

        const updatedMessage = await prisma.message.update({
            where: { id: messageId },
            data: { feedback }
        })

        return NextResponse.json({ success: true, message: updatedMessage })
    } catch (error: any) {
        console.error("Feedback API Error:", error)
        return NextResponse.json({ error: error.message || "An error occurred" }, { status: 500 })
    }
}
