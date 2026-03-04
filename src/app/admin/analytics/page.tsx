"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Users, MessageSquare, MousePointer2, TrendingUp, Globe, Facebook, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function AnalyticsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [stats, setStats] = useState({
        totalChats: 0,
        totalMessages: 0,
        totalLeads: 0,
        webChats: 0,
        fbChats: 0,
        recentActivity: [] as any[]
    })

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/admin/stats")
                const data = await res.json()
                setStats(data)
            } catch (error) {
                console.error("Failed to fetch statistics:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
            </div>
        )
    }

    const cards = [
        {
            title: "Total Chats",
            value: stats.totalChats,
            description: "Total conversations initiated",
            icon: MessageSquare,
            color: "text-blue-500",
            bg: "bg-blue-50 dark:bg-blue-900/20"
        },
        {
            title: "Messages",
            value: stats.totalMessages,
            description: "Total AI responses generated",
            icon: BarChart,
            color: "text-yellow-500",
            bg: "bg-yellow-50 dark:bg-yellow-900/20"
        },
        {
            title: "Captured Leads",
            value: stats.totalLeads,
            description: "Users who left contact details",
            icon: Users,
            color: "text-emerald-500",
            bg: "bg-emerald-50 dark:bg-emerald-900/20"
        }
    ]

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Analytics</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Monitor your chatbot's performance and user engagement.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {cards.map((card, i) => (
                    <Card key={i} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">{card.title}</CardTitle>
                            <div className={`p-2 rounded-lg ${card.bg}`}>
                                <card.icon className={`w-4 h-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                            <p className="text-xs text-slate-500 mt-1">{card.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Platform Distribution</CardTitle>
                        <CardDescription>Where your users are coming from</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-blue-500" />
                                    <span>Website Widget</span>
                                </div>
                                <span className="font-semibold">{stats.webChats}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full"
                                    style={{ width: `${stats.totalChats > 0 ? (stats.webChats / stats.totalChats) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <Facebook className="w-4 h-4 text-blue-600" />
                                    <span>Facebook Messenger</span>
                                </div>
                                <span className="font-semibold">{stats.fbChats}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${stats.totalChats > 0 ? (stats.fbChats / stats.totalChats) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest interactions with the bot</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recentActivity.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">No recent activity found.</p>
                            ) : (
                                stats.recentActivity.map((activity, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-full ${activity.role === 'user' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {activity.role === 'user' ? <MousePointer2 className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                                            </div>
                                            <div>
                                                <p className="font-medium line-clamp-1">{activity.content}</p>
                                                <p className="text-xs text-slate-500">{new Date(activity.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] uppercase">
                                            {activity.platform}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
