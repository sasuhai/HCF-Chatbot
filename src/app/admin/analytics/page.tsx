"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { BarChart, Users, MessageSquare, MousePointer2, TrendingUp, Globe, Facebook, Loader2, Search, Trash2, Calendar, MessageCircle, ChevronRight, MessageCircleMore, Trash, Filter, RefreshCw, X, ThumbsUp, ThumbsDown, Wand2, PenTool, CheckCircle, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function AnalyticsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [stats, setStats] = useState({
        totalChats: 0,
        totalMessages: 0,
        totalLeads: 0,
        positiveFeedback: 0,
        negativeFeedback: 0,
        webChats: 0,
        fbChats: 0,
        recentActivity: [] as any[],
        runtime: {
            version: "",
            platform: "",
            memory: "",
            uptime: "",
            env: "",
            deployedAt: "" as string | Date
        },
        aiUsage: {
            totalPromptTokens: 0,
            totalCompletionTokens: 0,
            totalTotalTokens: 0,
            totalCost: 0,
            monthlyBudget: 5,
            creditBalance: 0
        },
        popularQuestions: [] as { question: string, count: number }[],
        questionsLastUpdated: null as string | null
    })

    const [convData, setConvData] = useState({
        conversations: [] as any[],
        analytics: {
            topWords: [] as any[],
            sources: [] as any[]
        },
        pagination: { total: 0, pages: 1, current: 1 },
        excludedWords: [] as string[]
    })

    const [search, setSearch] = useState("")
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [purgeDays, setPurgeDays] = useState(30)
    const [filter, setFilter] = useState("")

    const [isRefreshingQuestions, setIsRefreshingQuestions] = useState(false)
    const [leads, setLeads] = useState<any[]>([])
    const [isLoadingLeads, setIsLoadingLeads] = useState(false)

    // Correction state
    const [correctingMessage, setCorrectingMessage] = useState<any>(null)
    const [correctionAnswer, setCorrectionAnswer] = useState("")
    const [isSavingCorrection, setIsSavingCorrection] = useState(false)

    const fetchStats = async () => {
        try {
            const res = await fetch("/api/admin/stats")
            const data = await res.json()

            // Also fetch smart grouped questions
            const qRes = await fetch("/api/admin/stats/questions")
            const qData = await qRes.json()

            if (data && !data.error) {
                setStats(prev => ({
                    ...prev,
                    ...data,
                    popularQuestions: qData.questions || [],
                    questionsLastUpdated: qData.lastUpdated
                }))
            } else if (data.error) {
                toast.error(data.error)
            }
        } catch (error) {
            console.error("Failed to fetch statistics:", error)
        }
    }

    const refreshQuestions = async () => {
        setIsRefreshingQuestions(true)
        try {
            const res = await fetch("/api/admin/stats/questions?refresh=true")
            const data = await res.json()
            setStats(prev => ({
                ...prev,
                popularQuestions: data.questions || [],
                questionsLastUpdated: data.lastUpdated
            }))
            toast.success("Questions analysis updated!")
        } catch (error) {
            toast.error("Failed to refresh analysis")
        } finally {
            setIsRefreshingQuestions(false)
        }
    }

    const fetchConversations = async (page = 1, query = "", activeFilter = filter) => {
        try {
            const res = await fetch(`/api/admin/conversations?page=${page}&search=${encodeURIComponent(query)}&filter=${activeFilter}`)
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

    const fetchLeads = async () => {
        setIsLoadingLeads(true)
        try {
            const res = await fetch("/api/admin/leads")
            const data = await res.json()
            if (data.leads) setLeads(data.leads)
        } catch (error) {
            console.error("Leads fetch error:", error)
        } finally {
            setIsLoadingLeads(false)
        }
    }

    const deleteLead = async (id: string) => {
        if (!confirm("Remove this lead?")) return
        try {
            const res = await fetch(`/api/admin/leads?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success("Lead removed")
                fetchLeads()
                fetchStats()
            }
        } catch (error) {
            toast.error("Failed to delete lead")
        }
    }

    useEffect(() => {
        const init = async () => {
            setIsLoading(true)
            await Promise.all([fetchStats(), fetchConversations(), fetchLeads()])
            setIsLoading(false)
        }
        init()
    }, [])

    const handleExcludeWord = async (word: string) => {
        try {
            const res = await fetch("/api/admin/conversations", {
                method: "POST",
                body: JSON.stringify({ word, action: 'exclude' })
            })
            if (res.ok) {
                toast.success('Keyword excluded')
                fetchConversations(convData.pagination.current, search)
            }
        } catch (error) {
            toast.error("Failed to exclude word")
        }
    }

    const handleRestoreWord = async (word: string) => {
        try {
            const res = await fetch("/api/admin/conversations", {
                method: "POST",
                body: JSON.stringify({ word, action: 'include' })
            })
            if (res.ok) {
                toast.success(`'${word}' restored to analysis`)
                fetchConversations(convData.pagination.current, search)
            }
        } catch (error) {
            toast.error("Failed to restore word")
        }
    }

    const resetExcludedWords = async () => {
        if (!confirm("Are you sure you want to restore all excluded keywords?")) return
        try {
            const res = await fetch("/api/admin/conversations", {
                method: "POST",
                body: JSON.stringify({ action: 'reset' })
            })
            if (res.ok) {
                toast.success('All keywords restored')
                fetchConversations(1, search)
            }
        } catch (error) {
            toast.error("Failed to reset")
        }
    }

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

    const handleSaveCorrection = async () => {
        if (!correctionAnswer.trim()) return
        setIsSavingCorrection(true)
        try {
            // Find the user question that preceded this assistant message
            const convo = convData.conversations.find(c => c.messages.some((m: any) => m.id === correctingMessage.id))
            const msgIdx = convo.messages.findIndex((m: any) => m.id === correctingMessage.id)
            const question = convo.messages[msgIdx - 1]?.content || "Unknown Question"

            const res = await fetch("/api/admin/corrections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messageId: correctingMessage.id,
                    question,
                    answer: correctionAnswer
                })
            })
            const data = await res.json()
            if (res.ok) {
                toast.success("Correction saved! AI knowledge updated.")
                if (data.warning) toast.warning(data.warning)
                setCorrectingMessage(null)
                setCorrectionAnswer("")
                fetchConversations(convData.pagination.current, search)
            } else {
                toast.error(data.error || "Failed to save correction")
            }
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setIsSavingCorrection(false)
        }
    }

    const updateAiConfig = async (payload: any) => {
        try {
            const res = await fetch("/api/admin/stats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })
            if (res.ok) {
                toast.success("AI Resources updated")
                fetchStats()
            }
        } catch (error) {
            toast.error("Failed to update AI config")
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
                <TabsList className="grid w-full grid-cols-4 mb-8">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="leads">Captured Leads</TabsTrigger>
                    <TabsTrigger value="history">Chat History</TabsTrigger>
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
                        <Card className="hover:shadow-md transition-shadow border-t-4 border-t-emerald-500">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">Helpful Responses</CardTitle>
                                <ThumbsUp className="w-4 h-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.positiveFeedback}</div>
                                <p className="text-xs text-slate-500 mt-1">Total 'Like' feedback received</p>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-md transition-shadow border-t-4 border-t-amber-500">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">Unhelpful Responses</CardTitle>
                                <ThumbsDown className="w-4 h-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.negativeFeedback}</div>
                                <p className="text-xs text-slate-500 mt-1">Total 'Dislike' feedback received</p>
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
                                {(!convData?.analytics?.sources || convData.analytics.sources.length === 0) && (
                                    <p className="text-sm text-slate-500 italic">No platform data available yet.</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Popular Keywords</CardTitle>
                                        <CardDescription>Most frequently used words in user messages</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={resetExcludedWords} className="text-[10px] h-7 text-slate-400 hover:text-rose-500">
                                        <RefreshCw className="w-3 h-3 mr-1" /> Reset
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {convData?.analytics?.topWords?.map((word: any, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleExcludeWord(word.text)}
                                            title="Click to exclude this word"
                                            className="flex items-center bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-rose-200 hover:bg-rose-50/30 transition-all group"
                                        >
                                            <span className="text-sm font-medium mr-2 group-hover:text-rose-500">{word.text}</span>
                                            <Badge variant="secondary" className="text-[10px] h-5 group-hover:bg-rose-100 group-hover:text-rose-600">{word.value}</Badge>
                                        </button>
                                    ))}
                                    {(convData?.analytics?.topWords?.length === 0) && (
                                        <p className="text-sm text-slate-500 italic">Not enough data to generate keywords yet.</p>
                                    )}
                                </div>
                                {convData.excludedWords?.length > 0 && (
                                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                                Restorable Exclusions <Badge variant="outline" className="h-4 px-1 text-[8px] border-slate-200">{convData.excludedWords.length}</Badge>
                                            </h4>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {convData.excludedWords.map((word, i) => (
                                                <div key={i} className="flex items-center bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1.5 rounded-lg text-[11px] text-slate-500 border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-900 group">
                                                    <span className="font-medium">{word}</span>
                                                    <button
                                                        onClick={() => handleRestoreWord(word)}
                                                        className="ml-2 p-0.5 rounded-md hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                                        title="Restore to analysis"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="mt-3 text-[9px] text-slate-400 italic">
                                            * These words were manually hidden. Click the (X) to bring them back.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* LEADS TAB */}
                <TabsContent value="leads">
                    <Card>
                        <CardHeader>
                            <CardTitle>Captured Leads</CardTitle>
                            <CardDescription>People who provided contact details during chat for follow-up.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border bg-white dark:bg-slate-950">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Contact Info</TableHead>
                                            <TableHead>Source Context</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingLeads ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8">
                                                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-yellow-500" />
                                                </TableCell>
                                            </TableRow>
                                        ) : leads.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-slate-500 italic">
                                                    No leads captured yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            leads.map((lead) => (
                                                <TableRow key={lead.id}>
                                                    <TableCell className="font-semibold">{lead.name || "Unknown"}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-0.5">
                                                            {lead.email && <span className="text-blue-600 dark:text-blue-400 text-xs">{lead.email}</span>}
                                                            {lead.phone && <span className="text-xs font-medium">{lead.phone}</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-500">
                                                        {lead.conversationId ? (
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline flex items-center gap-1.5 transition-colors font-medium">
                                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                                        {lead.source}
                                                                        <ChevronRight className="w-3 h-3 opacity-50" />
                                                                    </button>
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
                                                                    <DialogHeader className="p-6 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shrink-0">
                                                                        <div className="flex items-center gap-3 mb-1">
                                                                            <Badge variant="outline" className="text-white border-white/40 bg-white/10 text-[10px] uppercase">{lead.source}</Badge>
                                                                            <span className="text-[10px] text-yellow-100 opacity-80">{new Date(lead.createdAt).toLocaleString()}</span>
                                                                        </div>
                                                                        <DialogTitle className="text-xl">Lead Conversation Histroy</DialogTitle>
                                                                        <DialogDescription className="text-yellow-50">
                                                                            Reviewing chat context for {lead.name || "Unknown User"}
                                                                        </DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                                                                        {lead.conversation?.messages?.map((m: any) => (
                                                                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                                                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm ${m.role === 'user'
                                                                                    ? 'bg-yellow-500 text-white rounded-tr-none shadow-sm'
                                                                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm'
                                                                                    }`}>
                                                                                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                        {(!lead.conversation?.messages || lead.conversation.messages.length === 0) && (
                                                                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                                                                <MessageCircleMore className="w-12 h-12 mb-4 opacity-20" />
                                                                                <p className="italic">No messages found for this session.</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="p-4 border-t bg-white dark:bg-slate-950 text-right">
                                                                        <Button variant="outline" size="sm" onClick={() => (document.querySelector('[data-slot="dialog-close"]') as any)?.click()}>Close Transcript</Button>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 opacity-60 italic">
                                                                {lead.source} (no history)
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-500">
                                                        {new Date(lead.createdAt).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button onClick={() => deleteLead(lead.id)} variant="ghost" size="sm" className="text-rose-500">
                                                            <Trash className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* HISTORY TAB */}
                <TabsContent value="history">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>Full Chat Logs</CardTitle>
                                <CardDescription>Search and study actual customer conversations</CardDescription>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="hidden md:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                    <Button
                                        variant={filter === "" ? "secondary" : "ghost"}
                                        size="sm"
                                        className="h-7 text-[10px] px-3 shadow-none"
                                        onClick={() => {
                                            setFilter("")
                                            fetchConversations(1, search, "")
                                        }}
                                    >
                                        All
                                    </Button>
                                    <Button
                                        variant={filter === "unanswered" ? "secondary" : "ghost"}
                                        size="sm"
                                        className={`h-7 text-[10px] px-3 shadow-none ${filter === "unanswered" ? 'text-rose-600' : 'text-slate-500'}`}
                                        onClick={() => {
                                            setFilter("unanswered")
                                            fetchConversations(1, search, "unanswered")
                                        }}
                                    >
                                        Unanswered
                                    </Button>
                                    <Button
                                        variant={filter === "liked" ? "secondary" : "ghost"}
                                        size="sm"
                                        className={`h-7 text-[10px] px-3 shadow-none ${filter === "liked" ? 'text-emerald-600' : 'text-slate-500'}`}
                                        onClick={() => {
                                            setFilter("liked")
                                            fetchConversations(1, search, "liked")
                                        }}
                                    >
                                        Liked
                                    </Button>
                                    <Button
                                        variant={filter === "disliked" ? "secondary" : "ghost"}
                                        size="sm"
                                        className={`h-7 text-[10px] px-3 shadow-none ${filter === "disliked" ? 'text-amber-600' : 'text-slate-500'}`}
                                        onClick={() => {
                                            setFilter("disliked")
                                            fetchConversations(1, search, "disliked")
                                        }}
                                    >
                                        Disliked
                                    </Button>
                                </div>
                                <form onSubmit={handleSearch} className="flex items-center gap-2">
                                    <Input
                                        placeholder="Filter by keyword..."
                                        className="h-9 w-[180px]"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                    <Button size="sm" type="submit"><Filter className="w-4 h-4" /></Button>
                                </form>
                            </div>
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
                                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm relative ${m.role === 'user'
                                                        ? 'bg-yellow-500 text-white rounded-tr-none'
                                                        : m.notAnswered
                                                            ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900 rounded-tl-none border shadow-sm'
                                                            : m.feedback === 'like'
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 rounded-tl-none border shadow-sm'
                                                                : m.feedback === 'dislike'
                                                                    ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900 rounded-tl-none border shadow-sm'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700'
                                                        }`}>
                                                        <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed max-w-none">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm]}
                                                                components={{
                                                                    a: ({ node, ...props }) => (
                                                                        <a
                                                                            {...props}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="chatbot-link"
                                                                        />
                                                                    ),
                                                                }}
                                                            >
                                                                {m.content}
                                                            </ReactMarkdown>
                                                        </div>

                                                        {m.feedback && (
                                                            <div className={`absolute -top-2 -right-2 bg-white dark:bg-slate-800 rounded-full p-1.5 border shadow-md z-10`}>
                                                                {m.feedback === 'like' ? (
                                                                    <ThumbsUp className="w-4 h-4 text-emerald-600 fill-emerald-100 dark:fill-emerald-900" />
                                                                ) : (
                                                                    <ThumbsDown className="w-4 h-4 text-amber-600 fill-amber-100 dark:fill-amber-900" />
                                                                )}
                                                            </div>
                                                        )}

                                                        {m.role === 'assistant' && (
                                                            <div className={`flex justify-end gap-1 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 ${m.notAnswered ? 'border-rose-200' : ''}`}>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="xs"
                                                                    onClick={() => {
                                                                        setCorrectingMessage(m)
                                                                        setCorrectionAnswer(m.content)
                                                                    }}
                                                                    className={`h-7 text-[10px] ${m.notAnswered ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-yellow-600 hover:bg-yellow-50'}`}
                                                                >
                                                                    <Wand2 className="w-3 h-3 mr-1" />
                                                                    {m.notAnswered ? "Provide Answer" : "Improve Answer"}
                                                                </Button>
                                                            </div>
                                                        )}
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
                                    onClick={() => fetchConversations((convData?.pagination?.current || 1) - 1, search, filter)}
                                >Previous</Button>
                                <Button
                                    variant="outline"
                                    disabled={(convData?.pagination?.current || 1) >= (convData?.pagination?.pages || 1)}
                                    onClick={() => fetchConversations((convData?.pagination?.current || 1) + 1, search, filter)}
                                >Next</Button>
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* INSIGHTS TAB */}
                <TabsContent value="insights" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Popular Questions (Main Area) */}
                        <div className="md:col-span-2">
                            <Card className="h-full border-t-4 border-t-yellow-500 shadow-sm">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                                <TrendingUp className="w-5 h-5 text-yellow-600" />
                                            </div>
                                            <div>
                                                <CardTitle>Popular Actual Questions</CardTitle>
                                                <CardDescription>AI-compiled and grouped by semantic similarity.</CardDescription>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={isRefreshingQuestions}
                                            onClick={refreshQuestions}
                                            className="text-slate-400 hover:text-yellow-600 hover:bg-yellow-50"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isRefreshingQuestions ? 'animate-spin' : ''}`} />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {stats.popularQuestions?.length > 0 ? (
                                            stats.popularQuestions.map((item: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between p-4 border rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all group">
                                                    <div className="flex items-center gap-4 overflow-hidden">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-xs font-bold text-slate-500 group-hover:bg-yellow-100 group-hover:text-yellow-600 transition-colors">
                                                            {idx + 1}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            "{item.question}"
                                                        </span>
                                                    </div>
                                                    <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-none ml-4 shrink-0 px-3 py-1">
                                                        {item.count} asks
                                                    </Badge>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-20 border-2 border-dashed rounded-2xl border-slate-100 dark:border-slate-800">
                                                <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                <p className="text-sm text-slate-500 italic">No questions compiled yet. Data appears after several user interactions.</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-6 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-dotted">
                                        <p className="text-[10px] text-slate-400 italic">
                                            * Semantic grouping via GPT-4.1-mini
                                        </p>
                                        {stats.questionsLastUpdated && (
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                Last Analyzed: {new Date(stats.questionsLastUpdated).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar (Server Status & Sources) */}
                        <div className="md:col-span-1 space-y-6">
                            <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden">
                                <CardHeader className="pb-2 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-emerald-400" />
                                        <CardTitle className="text-xs font-bold uppercase tracking-wider">Hostinger Runtime</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold">Node Version</span>
                                            <div className="text-sm font-mono text-emerald-400">{stats.runtime?.version || "N/A"}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold">Memory</span>
                                            <div className="text-sm font-bold">{stats.runtime?.memory || "N/A"}</div>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-white/5 space-y-3">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-500 uppercase font-bold">Uptime</span>
                                            <span className="text-slate-300 font-medium">{stats.runtime?.uptime || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-500 uppercase font-bold">Last Build</span>
                                            <span className="text-slate-300 font-medium">
                                                {stats.runtime?.deployedAt ? new Date(stats.runtime.deployedAt).toLocaleString() : "N/A"}
                                            </span>
                                        </div>
                                        <Badge className={`${stats.runtime?.env === 'production' ? 'bg-emerald-500' : 'bg-amber-500'} w-full justify-center border-none text-[10px] py-1`}>
                                            {stats.runtime?.env?.toUpperCase() || "DEVELOPMENT"}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-blue-100 bg-blue-50/10 shadow-lg overflow-hidden relative group">
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-400 hover:text-blue-600">
                                                <Settings className="w-3.5 h-3.5" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-xs">
                                            <DialogHeader>
                                                <DialogTitle className="text-sm">Manage Billing Data</DialogTitle>
                                                <DialogDescription className="text-[10px]">As AI usage balance is not available via API, please update manually from platform.openai.com/usage</DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="budget" className="text-[10px]">Monthly Budget ($)</Label>
                                                    <Input
                                                        id="budget"
                                                        type="number"
                                                        defaultValue={stats.aiUsage?.monthlyBudget || 5}
                                                        onBlur={(e) => updateAiConfig({ budget: e.target.value })}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="balance" className="text-[10px]">Manual Top-up ($)</Label>
                                                    <Input
                                                        id="balance"
                                                        type="number"
                                                        defaultValue={stats.aiUsage?.creditBalance || 0}
                                                        onBlur={(e) => updateAiConfig({ balance: e.target.value })}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                                <Button size="xs" variant="outline" onClick={() => confirm("Reset all usage counters?") && updateAiConfig({ reset: true })} className="w-full text-rose-500 text-[10px]">
                                                    Reset All Usage Counters
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <CardHeader className="pb-3 px-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-2 items-center">
                                            <div className="p-1.5 bg-blue-500 rounded-lg">
                                                <TrendingUp className="w-4 h-4 text-white" />
                                            </div>
                                            <CardTitle className="text-xs font-black uppercase tracking-widest text-blue-700">AI Resource Monitoring</CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 px-5 pb-6">
                                    {/* Monthly Spending Progress (Like OpenAI) */}
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Current Month spending</span>
                                                <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                                                    ${(stats.aiUsage?.totalCost || 0).toFixed(2)}
                                                    <span className="text-xs text-slate-400 font-normal">/ ${(stats.aiUsage?.monthlyBudget || 5).toFixed(0)}</span>
                                                </div>
                                            </div>
                                            {(stats.aiUsage?.creditBalance > 0) && (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[9px] px-2 border-none">
                                                    Balance: ${stats.aiUsage.creditBalance.toFixed(2)}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="h-2 bg-slate-200/50 dark:bg-white/5 rounded-full overflow-hidden border border-slate-100 dark:border-white/10 p-[1px]">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${(stats.aiUsage?.totalCost || 0) / (stats.aiUsage?.monthlyBudget || 5) > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'
                                                    }`}
                                                style={{ width: `${Math.min(100, ((stats.aiUsage?.totalCost || 0) / (stats.aiUsage?.monthlyBudget || 5)) * 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-[9px] text-slate-400 italic">
                                            Calculated based on real completion usage logs.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-blue-100/30">
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Tokens</span>
                                            <div className="text-sm font-black font-mono">{(stats.aiUsage?.totalTotalTokens || 0).toLocaleString()}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Requests</span>
                                            <div className="text-sm font-black font-mono text-blue-600">{stats.totalMessages || 0}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Avg. Tokens / Req</span>
                                            <div className="text-sm font-black font-mono text-emerald-600">
                                                {Math.round((stats.aiUsage?.totalTotalTokens || 0) / (stats.totalMessages || 1)).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-slate-400 font-bold uppercase block">In/Out Ratio</span>
                                            <div className="text-sm font-black font-mono text-slate-500">
                                                {((stats.aiUsage?.totalPromptTokens || 1) / (stats.aiUsage?.totalCompletionTokens || 1)).toFixed(1)}:1
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 grayscale opacity-50 justify-center">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" className="w-3 h-3" alt="openai" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">Powered by GPT-4.1-mini</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <BarChart className="w-4 h-4 text-slate-400" /> Distribution
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {convData?.analytics?.sources?.slice(0, 3).map((s: any, i: number) => (
                                        <div key={i} className="flex flex-col gap-1">
                                            <div className="flex justify-between text-[10px]">
                                                <span className="font-bold truncate max-w-[70%]">{s.source}</span>
                                                <span className="text-slate-500 font-mono">{s.count}</span>
                                            </div>
                                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${(s.count / (stats.totalChats || 1)) * 100}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            <Card className="border-rose-100 bg-rose-50/10 shadow-sm">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm text-rose-600">Maintenance</CardTitle>
                                        <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold text-slate-400">Retention (Days)</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                min={30}
                                                value={purgeDays}
                                                onChange={(e) => setPurgeDays(Math.max(30, parseInt(e.target.value) || 30))}
                                                className="h-8 text-xs bg-white dark:bg-slate-950 border-rose-100"
                                            />
                                            <Badge variant="outline" className="text-[10px] text-slate-500 whitespace-nowrap">Min: 30d</Badge>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleMaintenance(purgeDays)}
                                        variant="outline"
                                        className="w-full text-rose-500 text-[10px] h-9 border-rose-200 hover:bg-rose-50 font-bold uppercase shadow-sm"
                                    >
                                        Purge older than {purgeDays} days
                                    </Button>
                                    <p className="text-[9px] text-slate-400 text-center italic">
                                        * This deletes all chat records older than {purgeDays} days.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Correction Dialog */}
            <Dialog open={!!correctingMessage} onOpenChange={(open) => !open && setCorrectingMessage(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PenTool className="w-5 h-5 text-yellow-500" />
                            {correctingMessage?.notAnswered ? "Provide Correct Answer" : "Improve AI Response"}
                        </DialogTitle>
                        <DialogDescription>
                            Your correction will update this chat history AND become part of the AI's permanent knowledge base.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-500">User's Question</Label>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm italic border border-slate-100 dark:border-slate-800">
                                {correctingMessage && (
                                    convData.conversations.find(c => c.messages.some((m: any) => m.id === correctingMessage.id))
                                        ?.messages[
                                        convData.conversations.find(c => c.messages.some((m: any) => m.id === correctingMessage.id))
                                            ?.messages.findIndex((m: any) => m.id === correctingMessage.id) - 1
                                    ]?.content
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="correction" className="text-[10px] uppercase font-bold text-slate-500">Correct Response</Label>
                            <Textarea
                                id="correction"
                                value={correctionAnswer}
                                onChange={(e) => setCorrectionAnswer(e.target.value)}
                                placeholder="Type the perfect answer here..."
                                className="min-h-[150px] leading-relaxed"
                            />
                            <p className="text-[10px] text-slate-400 italic">
                                Tip: Use professional yet friendly language. Include links using Markdown if needed.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCorrectingMessage(null)}>Cancel</Button>
                        <Button
                            onClick={handleSaveCorrection}
                            disabled={isSavingCorrection || !correctionAnswer.trim()}
                            className="bg-yellow-500 hover:bg-yellow-600 gap-2"
                        >
                            {isSavingCorrection ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Update History & AI Knowledge
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
