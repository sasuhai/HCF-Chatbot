"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save, Undo, Sparkles, MessageCircle } from "lucide-react"
import { toast } from "sonner"

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [settings, setSettings] = useState({
        botName: "HCF Assistant",
        welcomeMessage: "Assalamu'alaikum! Welcome to Hidayah Centre Foundation. How can I assist you today?",
        systemPrompt: "You are a helpful AI assistant for Hidayah Centre Foundation (HCF). Your goal is to guide people about Islam, provide info about HCF programs, and handle inquiries politely. Use the provided context to answer questions.",
        quickReplies: "How to donate?, Learn about Islam, Prayer times",
        faqSource: "MANUAL"
    })

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch("/api/admin/settings")
                const data = await res.json()
                if (data.settings) {
                    setSettings(data.settings)
                }
            } catch (error) {
                console.error("Failed to fetch settings:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchSettings()
    }, [])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const res = await fetch("/api/admin/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings)
            })
            if (res.ok) {
                toast.success("Settings saved successfully")
            } else {
                toast.error("Failed to save settings")
            }
        } catch (error) {
            console.error("Save error:", error)
            toast.error("An error occurred while saving")
        } finally {
            setIsSaving(false)
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
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Configure how the AI chatbot behaves and presents itself to users.</p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-yellow-500" />
                            <CardTitle>Chatbot Appearance</CardTitle>
                        </div>
                        <CardDescription>Customizing the identity and greeting of the bot.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="botName">Chatbot Display Name</Label>
                            <Input
                                id="botName"
                                value={settings.botName}
                                onChange={(e) => setSettings({ ...settings, botName: e.target.value })}
                                placeholder="e.g., HCF Guide"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="welcomeMessage">Welcome Message</Label>
                            <Input
                                id="welcomeMessage"
                                value={settings.welcomeMessage}
                                onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                                placeholder="Enter the first message the user sees"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-500" />
                            <CardTitle>AI Behavior & Logic</CardTitle>
                        </div>
                        <CardDescription>Defining the 'personality' and boundaries of the AI response generator.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="systemPrompt">System Instructions (Prompt)</Label>
                            <Textarea
                                id="systemPrompt"
                                value={settings.systemPrompt}
                                onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                                placeholder="Tell the AI who it is and how to behave..."
                                className="min-h-[150px] leading-relaxed"
                            />
                            <p className="text-xs text-slate-500">
                                This hidden prompt is sent with every query. Be specific about the tone (e.g., "gentle," "professional") and restrictions.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-emerald-500" />
                            <CardTitle>Quick Replies & FAQ</CardTitle>
                        </div>
                        <CardDescription>Configure the suggestive buttons that appear at the bottom of the chat.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label>FAQ Strategy</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setSettings({ ...settings, faqSource: "MANUAL" })}
                                    className={`p-4 border rounded-xl text-left transition-all ${settings.faqSource === "MANUAL" ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <p className="font-semibold text-sm">Prepared by Admin</p>
                                    <p className="text-xs text-slate-500">Show exactly the questions you type below.</p>
                                </button>
                                <button
                                    onClick={() => setSettings({ ...settings, faqSource: "AUTO" })}
                                    className={`p-4 border rounded-xl text-left transition-all ${settings.faqSource === "AUTO" ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <p className="font-semibold text-sm">AI Most Common</p>
                                    <p className="text-xs text-slate-500">Automatically show questions from chat history.</p>
                                </button>
                            </div>
                        </div>

                        {settings.faqSource === "MANUAL" && (
                            <div className="space-y-2">
                                <Label htmlFor="quickReplies">Suggested Questions (Comma separated)</Label>
                                <Input
                                    id="quickReplies"
                                    value={settings.quickReplies}
                                    onChange={(e) => setSettings({ ...settings, quickReplies: e.target.value })}
                                    placeholder="How to donate?, What is Islam?, Program schedule"
                                />
                                <p className="text-xs text-slate-500">These will appear as tappable bubbles for the user.</p>
                            </div>
                        )}

                        {settings.faqSource === "AUTO" && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed text-center">
                                <p className="text-sm text-slate-500 italic">"AI will analyze recent chat history to suggest the most relevant questions."</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="bg-slate-50/50 dark:bg-slate-900/50 flex justify-between px-6 py-4">
                        <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
                            <Undo className="w-4 h-4" /> Reset Changes
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-yellow-500 hover:bg-yellow-600 gap-2">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Configuration
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
