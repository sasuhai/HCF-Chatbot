"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X, Send, Paperclip, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

type Message = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
}

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        { id: "1", role: "assistant", content: "Assalamu'alaikum! I am the Hidayah Centre Foundation Assistant. How can I help you today?" }
    ])

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

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

    const processStream = async (res: Response, newMessages: Message[]) => {
        if (!res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        let assistantContent = "";
        const id = Date.now().toString();

        // Add an empty assistant message to update
        setMessages((prev) => [...prev, { id, role: "assistant", content: "" }]);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            assistantContent += chunk;
            setMessages((prev) => {
                const updated = [...prev];
                const idx = updated.findIndex(m => m.id === id);
                if (idx !== -1) updated[idx].content = assistantContent;
                return updated;
            });
        }
    }

    const onSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
        if (e) e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMsg: Message = { id: Date.now().toString(), role: "user", content: input }
        const newMessages = [...messages, userMsg]
        setMessages(newMessages)
        setInput("")
        setIsLoading(true)

        // Immediate focus back to input (though it will be disabled until loaded)
        setTimeout(() => inputRef.current?.focus(), 0)

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: newMessages })
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Server responded with ${res.status}`);
            }

            await processStream(res, newMessages)

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
        inputRef.current?.focus()
    }

    const handleClearChat = () => {
        if (confirm("Are you sure you want to clear the chat history?")) {
            setMessages([
                { id: "1", role: "assistant", content: "Assalamu'alaikum! I am the Hidayah Centre Foundation Assistant. How can I help you today?" }
            ])
            setInput("")
            inputRef.current?.focus()
        }
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
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
                                    <span className="font-bold text-lg">HCF</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold leading-tight">HCF Assistant</h3>
                                    <p className="text-xs text-yellow-100 opacity-90">Usually replies instantly</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
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
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${msg.role === "user"
                                                ? "bg-yellow-500 text-white rounded-tr-none"
                                                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none"
                                                }`}
                                        >
                                            {msg.content}
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
                            <button type="button" onClick={() => handleQuickReply("How to donate?")} className="whitespace-nowrap px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium hover:bg-yellow-200 transition-colors">How to donate?</button>
                            <button type="button" onClick={() => handleQuickReply("Learn about Islam")} className="whitespace-nowrap px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium hover:bg-yellow-200 transition-colors">Learn about Islam</button>
                        </div>

                        {/* Input */}
                        <form onSubmit={onSubmit} className="p-3 bg-white dark:bg-slate-950 border-t flex items-center gap-2 shrink-0">
                            <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 rounded-full shrink-0">
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
