import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const dbSettings = await prisma.setting.findMany()

        // Convert array to object
        const settings: Record<string, string> = {}
        dbSettings.forEach(s => {
            settings[s.key] = s.value
        })

        // Default fallbacks if empty
        return NextResponse.json({
            settings: {
                botName: settings["botName"] || "HCF Assistant",
                welcomeMessage: settings["welcomeMessage"] || "Assalamu'alaikum! Welcome to Hidayah Centre Foundation. How can I assist you today?",
                systemPrompt: settings["systemPrompt"] || "You are a helpful AI assistant for Hidayah Centre Foundation (HCF). Your goal is to guide people about Islam, provide info about HCF programs, and handle inquiries politely. Use the provided context to answer questions."
            }
        })
    } catch (error) {
        console.error("Settings GET Error:", error)
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const keys = Object.keys(body)

        // Upsert each setting
        const promises = keys.map(key => {
            return prisma.setting.upsert({
                where: { key },
                update: { value: body[key] },
                create: { key, value: body[key] }
            })
        })

        await Promise.all(promises)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Settings POST Error:", error)
        return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
    }
}
