"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { BarChart, Users, MessageSquare, MousePointer2, TrendingUp, Globe, Facebook, Loader2, Search, Trash2, Calendar, MessageCircle, ChevronRight, MessageCircleMore, Trash, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

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

    const [convData, setConvData] = useState({
        conversations: [] as any[],
        analytics: {
            topWords: [] as any[],
            sources: [] as any[]
        },
        pagination: { total: 0, pages: 1, current: 1 }
    })

    const [search, setSearch] = useState("")
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    const fetchStats = async () => {
        try {
            const res = await fetch("/api/admin/stats")
            const data = await res.json()
            setStats(data)
        } catch (error) {
            console.error("Failed to fetch statistics:", error)
        }
    }

    const fetchConversations = async (page = 1, query = "") => {
        try {
            const res = await fetch(`/api/admin/conversations?page=${page}&search=${encodeURIComponent(query)}`)
            const data = await res.json()
            if (data && data.conversations) {
                setConvData(data)
            } else if (data.error) {
                toast.error(data.error)
            }
        } catch (error) {
            console.error("Failed to fetch conversations:", error)
            toast.error("Could not load conversational data")
        }
    }

    useEffect(() => {
        const init = async () => {
            setIsLoading(true)
            await Promise.all([fetchStats(), fetchConversations()])
            setIsLoading(false)
        }
        init()
    }, [])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        fetchConversations(1, search)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this conversation? This cannot be undone.")) return

        setIsDeleting(id)
        try {
            const res = await fetch(`/api/admin/conversations?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success("Conversation deleted")
                fetchConversations(convData.pagination.current, search)
                fetchStats()
            }
        } catch (error) {
            toast.error("Failed to delete")
        } finally {
            setIsDeleting(null)
        }
    }

    const handleMaintenance = async (days: number) => {
        if (!confirm(`Are you sure you want to delete all data older than ${days} days?`)) return

        try {
            const res = await fetch(`/api/admin/conversations?olderThan=${days}`, { method: 'DELETE' })
            const data = await res.json()
            if (res.ok) {
                toast.success(`Deleted ${data.count} old records`)
                fetchConversations(1)
                fetchStats()
            }
        } catch (error) {
            toast.error("Maintenance failed")
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Analytics & Insights</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Study customer behavior and manage chat records.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleMaintenance(30)} className="text-xs text-rose-500 border-rose-100 hover:bg-rose-50">
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Cleanup 30d
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="text-xs">
                        Refresh
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                    <TabsTrigger value="overview">Performance Overview</TabsTrigger>
                    <TabsTrigger value="history">Chat History (Full)</TabsTrigger>
                    <TabsTrigger value="insights">Deep Insights</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-8">
                    <div className="grid gap-6 md:grid-cols-3">
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">Total Chats</CardTitle>
                                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                    <MessageSquare className="w-4 h-4 text-blue-500" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalChats}</div>
                                <p className="text-xs text-slate-500 mt-1">Total conversations initiated</p>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">Messages</CardTitle>
                                <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                                    <BarChart className="w-4 h-4 text-yellow-500" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalMessages}</div>
                                <p className="text-xs text-slate-500 mt-1">Total exchanges handled</p>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">Captured Leads</CardTitle>
                                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                                    <Users className="w-4 h-4 text-emerald-500" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalLeads}</div>
                                <p className="text-xs text-slate-500 mt-1">Users requesting outreach</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Platform Distribution</CardTitle>
                                <CardDescription>Rollout locations and sources</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {convData?.analytics?.sources?.map((s: any, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2 truncate max-w-[80%]">
                                                {s.platform === 'WEB' ? <Globe className="w-3 h-3 text-blue-500" /> : <Facebook className="w-3 h-3 text-blue-600" />}
                                                <span className="truncate">{s.source}</span>
                                            </div>
                                            <span className="font-bold">{s.count} chats</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className={`h-full ${s.platform === 'WEB' ? 'bg-blue-500' : 'bg-blue-600'}`}
                                                style={{ width: `${(s.count / (stats.totalChats || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Popular Keywords</CardTitle>
                                <CardDescription>Most frequently used words in user messages</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {convData?.analytics?.topWords?.map((word: any, i) => (
                                        <div key={i} className="flex items-center bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                            <span className="text-sm font-medium mr-2">{word.text}</span>
                                            <Badge variant="secondary" className="text-[10px] h-5">{word.value}</Badge>
                                        </div>
                                    ))}
                                    {(convData?.analytics?.topWords?.length === 0) && (
                                        <p className="text-sm text-slate-500 italic">Not enough data to generate keywords yet.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* HISTORY TAB */}
                <TabsContent value="history">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>Full Chat Logs</CardTitle>
                                <CardDescription>Search and study actual customer conversations</CardDescription>
                            </div>
                            <form onSubmit={handleSearch} className="flex items-center gap-2">
                                <Input
                                    placeholder="Filter by keyword..."
                                    className="h-9 w-[200px]"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <Button size="sm" type="submit"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
                            </form>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {convData?.conversations?.map((convo: any) => (
                                    <div key={convo.id} className="border dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/30">
                                        <div className="bg-slate-100/50 dark:bg-slate-800/50 px-4 py-3 flex items-center justify-between border-b">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="secondary" className="text-[10px] uppercase">{convo.platform}</Badge>
                                                <span className="text-xs text-slate-500 truncate max-w-[200px]">{convo.source || "Direct"}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">{convo.id}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" /> {new Date(convo.createdAt).toLocaleString()}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                    disabled={isDeleting === convo.id}
                                                    onClick={() => handleDelete(convo.id)}
                                                >
                                                    {isDeleting === convo.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash className="w-3.5 h-3.5" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto bg-white dark:bg-slate-950">
                                            {convo.messages.map((m: any) => (
                                                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user'
                                                        ? 'bg-yellow-500 text-white rounded-tr-none'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700'
                                                        }`}>
                                                        <p className="whitespace-pre-wrap">{m.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {convo.messages.length === 0 && <p className="text-center text-xs text-slate-500 py-4">Session started but no messages exchanged.</p>}
                                        </div>
                                    </div>
                                ))}
                                {convData?.conversations?.length === 0 && (
                                    <div className="text-center py-20 border-2 border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                                        <MessageCircleMore className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                        <p className="text-slate-500">No conversations found matching your criteria.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-center border-t py-4">
                            {/* Simplified pagination */}
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    disabled={(convData?.pagination?.current || 1) <= 1}
                                    onClick={() => fetchConversations((convData?.pagination?.current || 1) - 1, search)}
                                >Previous</Button>
                                <Button
                                    variant="outline"
                                    disabled={(convData?.pagination?.current || 1) >= (convData?.pagination?.pages || 1)}
                                    onClick={() => fetchConversations((convData?.pagination?.current || 1) + 1, search)}
                                >Next</Button>
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* INSIGHTS TAB */}
                <TabsContent value="insights">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Detailed Sources & Rollouts</CardTitle>
                                <CardDescription>Tracking every domain hosting the chatbot.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {convData?.analytics?.sources?.map((s: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
                                            <div className="flex flex-col gap-0.5 max-w-[70%]">
                                                <span className="text-[10px] uppercase font-bold text-slate-400">{s.platform}</span>
                                                <span className="text-sm font-medium truncate">{s.source}</span>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant="secondary">{s.count} Chats</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Data Management & Maintenance</CardTitle>
                                <CardDescription>Tools for house-keeping and privacy.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/50 rounded-xl">
                                    <h4 className="font-semibold text-rose-700 dark:text-rose-400 text-sm mb-2 flex items-center">
                                        <Trash2 className="w-4 h-4 mr-2" /> Immediate Purge
                                    </h4>
                                    <p className="text-xs text-rose-600 dark:text-rose-500 mb-4 leading-relaxed">
                                        Deleting old records improves dashboard performance and ensures you only store relevant user data.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button onClick={() => handleMaintenance(7)} variant="outline" size="sm" className="h-9 text-[10px] font-bold border-rose-200">DELETE OOLDER THAN 7 DAYS</Button>
                                        <Button onClick={() => handleMaintenance(90)} variant="outline" size="sm" className="h-9 text-[10px] font-bold border-rose-200">DELETE OLDER THAN 90 DAYS</Button>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-slate-500 italic">"Total current records: {stats.totalChats} chats, {stats.totalMessages} messages"</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
