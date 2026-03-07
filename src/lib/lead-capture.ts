import { prisma } from "./prisma"

/**
 * Poor man's lead extractor using regex. 
 * For better results, this could be an LLM call, 
 * but regex is free and captures the basics.
 */
export async function extractAndSaveLead(content: string, conversationId: string, platform: string) {
    // Regex patterns
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi
    const phoneRegex = /(\+?6?01[0-9]-?[0-9]{7,8}|0[1-9][0-9]-?[0-9]{7,8})/g // Malaysian format focus

    const emails = content.match(emailRegex)
    const phones = content.match(phoneRegex)

    if (emails || phones) {
        // Try to find a name if it's "My name is X" or "Nama saya X"
        const nameMatch = content.match(/(?:my name is|nama saya|i am|saya) ([a-z\s]{2,30})(?:\.|\n|$| ,)/i)
        const name = nameMatch ? nameMatch[1].trim() : null

        try {
            // Check if this conversation already has a lead to avoid duplicates
            // We'll use the conversationId as part of the source to track
            const existingLead = await prisma.lead.findFirst({
                where: {
                    OR: [
                        emails ? { email: emails[0] } : { id: 'never-match' },
                        phones ? { phone: phones[0] } : { id: 'never-match' }
                    ]
                }
            })

            if (!existingLead) {
                await prisma.lead.create({
                    data: {
                        name: name,
                        email: emails ? emails[0] : null,
                        phone: phones ? phones[0] : null,
                        source: `${platform} Chat`,
                        conversationId: conversationId
                    }
                })
                return true
            }
        } catch (error) {
            console.error("Lead Capture Error:", error)
        }
    }
    return false
}
