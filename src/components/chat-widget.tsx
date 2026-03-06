"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X, Send, Paperclip, RotateCcw, Copy, Check, ThumbsUp, ThumbsDown, Reply } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from "sonner"
import { v4 as uuidv4 } from 'uuid'

type Message = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    feedback?: 'like' | 'dislike' | null;
    parentId?: string | null;
    parentContent?: string | null;
}

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [conversationId, setConversationId] = useState<string | null>(null)
    const [config, setConfig] = useState({
        botName: "HCF Assistant",
        welcomeMessage: "Assalamu'alaikum! I am the Hidayah Centre Foundation Assistant. How can I help you today?",
        quickReplies: ["How to donate?", "Learn about Islam"],
    })
    const [messages, setMessages] = useState<Message[]>([])
    const [attachments, setAttachments] = useState<File[]>([])
    const [replyingTo, setReplyingTo] = useState<Message | null>(null)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Initialize session and fetch settings
    useEffect(() => {
        let sId = localStorage.getItem('hcf_chat_session_id')
        if (!sId) {
            sId = uuidv4()
            localStorage.setItem('hcf_chat_session_id', sId)
        }
        setSessionId(sId)

        const fetchConfig = async () => {
            try {
                const res = await fetch("/api/admin/settings")
                const data = await res.json()
                if (data.settings) {
                    let qReplies = []
                    const strategy = data.settings.faqSource || "MANUAL"

                    if (strategy === "AUTO") {
                        try {
                            const autoRes = await fetch("/api/admin/faq/auto")
                            const autoData = await autoRes.json()
                            qReplies = autoData.questions || ["How to donate?", "Learn about Islam"]
                        } catch (e) {
                            qReplies = ["How to donate?", "Learn about Islam"]
                        }
                    } else {
                        qReplies = data.settings.quickReplies
                            ? data.settings.quickReplies.split(',').map((s: string) => s.trim())
                            : ["How to donate?", "Learn about Islam"]
                    }

                    setConfig({
                        botName: data.settings.botName || "HCF Assistant",
                        welcomeMessage: data.settings.welcomeMessage || "Assalamu'alaikum! I am the Hidayah Centre Foundation Assistant. How can I help you today?",
                        quickReplies: qReplies
                    })

                    setMessages([{
                        id: "welcome",
                        role: "assistant",
                        content: data.settings.welcomeMessage || "Assalamu'alaikum! I am the Hidayah Centre Foundation Assistant. How can I help you today?"
                    }])
                }
            } catch (error) {
                console.error("Failed to fetch widget config:", error)
                setMessages([{ id: "welcome", role: "assistant", content: config.welcomeMessage }])
            }
        }
        fetchConfig()
    }, [])

    useEffect(() => {
        // Auto-scroll logic
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages.length, isLoading])

    // Auto-focus input when loading finishes or widget opens
    useEffect(() => {
        if (!isLoading && isOpen) {
            inputRef.current?.focus()
        }
    }, [isLoading, isOpen])

    const processStream = async (res: Response, newMessages: Message[], assistantId: string) => {
        if (!res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        let assistantContent = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            assistantContent += chunk;
            setMessages((prev) => {
                const updated = [...prev];
                const idx = updated.findIndex(m => m.id === assistantId);
                if (idx !== -1) updated[idx].content = assistantContent;
                return updated;
            });
        }
    }

    const onSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
        if (e) e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
            parentId: replyingTo?.id,
            parentContent: replyingTo?.content
        }
        const newMessages = [...messages, userMsg]
        setMessages(newMessages)
        setInput("")
        setIsLoading(true)

        // Immediate focus back to input (though it will be disabled until loaded)
        setTimeout(() => inputRef.current?.focus(), 0)

        const fileData = await Promise.all(attachments.map(async (file) => {
            return new Promise<{ name: string, type: string, data: string }>((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => {
                    resolve({
                        name: file.name,
                        type: file.type,
                        data: (reader.result as string).split(',')[1] // Base64 portion only
                    })
                }
                reader.readAsDataURL(file)
            })
        }))

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: newMessages,
                    sessionId,
                    conversationId,
                    attachments: fileData,
                    parentId: replyingTo?.id
                })
            })

            // Clear attachments and reply state after sending
            setAttachments([])
            setReplyingTo(null)

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Server responded with ${res.status}`);
            }

            // Capture the conversationId and assistant messageId
            const convId = res.headers.get('x-conversation-id')
            const msgId = res.headers.get('x-message-id')

            if (convId && !conversationId) {
                setConversationId(convId)
            }

            const tempId = Date.now().toString();
            // Add an empty assistant message to update
            setMessages((prev) => [...prev, { id: msgId || tempId, role: "assistant", content: "" }]);

            await processStream(res, newMessages, msgId || tempId)

        } catch (error: any) {
            console.error("Chat Error:", error)
            const errorMsg = error.message || "An error occurred connecting to the assistant."
            setMessages((prev) => [...prev, {
                id: Date.now().toString(),
                role: "assistant",
                content: `⚠️ Error: ${errorMsg}. Please ensure your API keys and Database are correctly configured.`
            }])
        } finally {
            setIsLoading(false)
            // Focus again after loading finishes
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }

    const handleQuickReply = (text: string) => {
        setInput(text)
        setTimeout(() => {
            const currentForm = document.getElementById('hcf-chat-form') as HTMLFormElement
            if (currentForm) currentForm.requestSubmit()
        }, 10)
    }

    const handleClearChat = () => {
        if (confirm("Are you sure you want to clear the chat history?")) {
            setMessages([
                { id: "welcome", role: "assistant", content: config.welcomeMessage }
            ])
            setInput("")
            setConversationId(null) // Start fresh in DB
            inputRef.current?.focus()
        }
    }

    const handleCopyChat = () => {
        const chatText = messages
            .map(m => `${m.role === 'user' ? 'Client' : 'HCF Assistant'}: ${m.content}`)
            .join('\n\n')

        navigator.clipboard.writeText(chatText).then(() => {
            toast.success("Chat history copied to clipboard!")
        }).catch(err => {
            console.error("Failed to copy:", err)
            toast.error("Could not copy chat history.")
        })
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files)
            setAttachments(prev => [...prev, ...newFiles])
        }
    }

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const handleFeedback = async (messageId: string, feedback: 'like' | 'dislike') => {
        // Optimistic update
        setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, feedback: m.feedback === feedback ? null : feedback } : m
        ))

        try {
            const res = await fetch("/api/chat/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messageId, feedback })
            })
            if (!res.ok) throw new Error("Failed to send feedback")
            toast.success("Thank you for your feedback!")
        } catch (error) {
            console.error(error)
            toast.error("Failed to save feedback.")
            // Rollback if needed, but for simplicity let's just keep the optimistic state
        }
    }

    const handleReply = (msg: Message) => {
        setReplyingTo(msg)
        inputRef.current?.focus()
    }

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-20 right-0 w-[380px] h-[600px] max-h-[80vh] bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-yellow-200 dark:border-yellow-900/30 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 text-white flex justify-between items-center shadow-md z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-inner overflow-hidden border border-white/30">
                                    <img
                                        src="https://hidayahcentre.org.my/wp-content/uploads/2021/06/logo-web2.png"
                                        alt="HCF Logo"
                                        className="w-8 h-auto object-contain"
                                    />
                                </div>
                                <div>
                                    <h3 className="font-semibold leading-tight">{config.botName}</h3>
                                    <p className="text-xs text-yellow-100 opacity-90">Usually replies instantly</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button onClick={handleCopyChat} variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full w-8 h-8" title="Copy Chat">
                                    <Copy className="w-4 h-4" />
                                </Button>
                                <Button onClick={handleClearChat} variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full w-8 h-8" title="Clear Chat">
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full w-8 h-8" onClick={() => setIsOpen(false)}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages */}
                        <ScrollArea className="flex-1 min-h-0 p-4 bg-slate-50 dark:bg-slate-900/50">
                            <div className="space-y-4 pb-4 flex flex-col">
                                {messages.map((msg) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={msg.id}
                                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div className="flex flex-col gap-1 max-w-[80%]">
                                            <div
                                                className={`rounded-2xl px-4 py-3 text-sm shadow-sm relative group ${msg.role === "user"
                                                    ? "bg-yellow-500 text-white rounded-tr-none"
                                                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none"
                                                    }`}
                                            >
                                                {/* Parent message preview if it's a reply */}
                                                {msg.parentContent && (
                                                    <div className="mb-2 p-2 bg-black/5 dark:bg-white/5 rounded text-xs border-l-2 border-yellow-400 italic truncate opacity-80">
                                                        {msg.parentContent}
                                                    </div>
                                                )}

                                                <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-white max-w-none">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>

                                                {/* Actions (Like/Dislike/Reply) */}
                                                <div className={`absolute -bottom-8 ${msg.role === "user" ? "right-1" : "left-1"} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 z-20`}>
                                                    {msg.role === "assistant" && msg.id !== "welcome" && (
                                                        <>
                                                            <button
                                                                onClick={() => handleFeedback(msg.id, 'like')}
                                                                className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${msg.feedback === 'like' ? 'text-yellow-600' : 'text-slate-400'}`}
                                                            >
                                                                <ThumbsUp className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleFeedback(msg.id, 'dislike')}
                                                                className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${msg.feedback === 'dislike' ? 'text-yellow-600' : 'text-slate-400'}`}
                                                            >
                                                                <ThumbsDown className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => handleReply(msg)}
                                                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400"
                                                    >
                                                        <Reply className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Show reaction indicators if already liked/disliked and not hovered */}
                                            {msg.feedback && (
                                                <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mt-1.5`}>
                                                    <span className="text-[10px] bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-full px-1.5 py-0.5 shadow-sm flex items-center gap-1 text-slate-500">
                                                        {msg.feedback === 'like' ? <ThumbsUp className="w-2.5 h-2.5 text-yellow-600" /> : <ThumbsDown className="w-2.5 h-2.5 text-yellow-600" />}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                                {isLoading && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                        <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-1">
                                            <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                                            <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                                            <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                                        </div>
                                    </motion.div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Quick Replies */}
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 flex gap-2 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800 shrink-0">
                            {config.quickReplies.map((reply, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleQuickReply(reply)}
                                    className="whitespace-nowrap px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium hover:bg-yellow-200 transition-colors"
                                >
                                    {reply}
                                </button>
                            ))}
                        </div>

                        {/* Replying To Overlay */}
                        {replyingTo && (
                            <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/10 border-t border-yellow-100 dark:border-yellow-900/30 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Reply className="w-3 h-3 text-yellow-600 shrink-0" />
                                    <span className="text-[11px] text-yellow-800 dark:text-yellow-600 truncate italic">
                                        Replying to: {replyingTo.content}
                                    </span>
                                </div>
                                <button onClick={() => setReplyingTo(null)} className="text-yellow-600 hover:text-yellow-700 p-1">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        {/* File Previews */}
                        {attachments.length > 0 && (
                            <div className="px-4 py-2 bg-white dark:bg-slate-950 border-t flex gap-2 overflow-x-auto">
                                {attachments.map((file, idx) => (
                                    <div key={idx} className="relative group shrink-0">
                                        <div className="w-16 h-16 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-1 overflow-hidden">
                                            {file.type.startsWith('image/') ? (
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt="preview"
                                                    className="w-full h-full object-cover rounded"
                                                />
                                            ) : (
                                                <div className="text-[10px] text-center font-medium truncate px-1">
                                                    {file.name.split('.').pop()?.toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => removeAttachment(idx)}
                                            className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Input */}
                        <form id="hcf-chat-form" onSubmit={onSubmit} className="p-3 bg-white dark:bg-slate-950 border-t flex items-center gap-2 shrink-0">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                multiple
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-slate-600 rounded-full shrink-0"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip className="w-5 h-5" />
                            </Button>
                            <Input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your message..."
                                disabled={isLoading}
                                className="flex-1 rounded-full border-slate-200 dark:border-slate-800 focus-visible:ring-yellow-500 bg-slate-50 dark:bg-slate-900"
                            />
                            <Button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-full w-10 h-10 p-0 shrink-0 shadow-md"
                            >
                                <Send className="w-4 h-4 ml-1" />
                            </Button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full shadow-xl text-white flex items-center justify-center hover:shadow-yellow-500/25 transition-shadow"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </motion.button>
        </div>
    )
} 
