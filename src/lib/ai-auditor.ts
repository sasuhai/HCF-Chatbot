import { prisma } from "./prisma"

export type TokenUsage = any;

// Pricing for gpt-4o-mini (as of April 2024 approx)
// Input: $0.150 / 1M tokens
// Output: $0.600 / 1M tokens
const PRICING = {
    "gpt-4o-mini": {
        input: 0.15 / 1000000,
        output: 0.60 / 1000000
    }
}

export async function logAiUsage(model: string, usage: TokenUsage) {
    try {
        const modelKey = model.includes("gpt-4o-mini") ? "gpt-4o-mini" : "default"
        const pricing = PRICING[modelKey as keyof typeof PRICING] || { input: 0, output: 0 }

        const cost = (usage.promptTokens * pricing.input) + (usage.completionTokens * pricing.output)

        // Fetch current stats
        const setting = await prisma.setting.findUnique({
            where: { key: "ai_usage_stats" }
        })

        let stats = {
            totalPromptTokens: 0,
            totalCompletionTokens: 0,
            totalTotalTokens: 0,
            totalCost: 0,
            monthlyBudget: 5.00, // Default $5 budget
            creditBalance: 0,    // User can manually set this
            lastUpdated: new Date()
        }

        if (setting) {
            const savedStats = JSON.parse(setting.value)
            stats = { ...stats, ...savedStats }
        }

        // Update stats
        stats.totalPromptTokens += usage.promptTokens
        stats.totalCompletionTokens += usage.completionTokens
        stats.totalTotalTokens += usage.totalTokens
        stats.totalCost += cost
        stats.lastUpdated = new Date()

        // Deduct from balance if balance exists
        if (stats.creditBalance > 0) {
            stats.creditBalance = Math.max(0, stats.creditBalance - cost)
        }

        // Save back
        await prisma.setting.upsert({
            where: { key: "ai_usage_stats" },
            update: { value: JSON.stringify(stats) },
            create: { key: "ai_usage_stats", value: JSON.stringify(stats) }
        })

        return cost
    } catch (error) {
        console.error("Failed to log AI usage:", error)
        return 0
    }
}
