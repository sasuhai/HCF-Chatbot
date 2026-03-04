"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Link as LinkIcon, Upload, Search, Plus, Trash2, Video, Loader2, Image as ImageIcon } from "lucide-react"

type Document = {
    id: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
}

export default function AdminKnowledgeBase() {
    const [activeTab, setActiveTab] = useState("all")
    const [urlInput, setUrlInput] = useState("")
    const [isIngesting, setIsIngesting] = useState(false)
    const [documents, setDocuments] = useState<Document[]>([])
    const [isLoadingDocs, setIsLoadingDocs] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const fetchDocuments = async () => {
        try {
            const res = await fetch('/api/admin/documents')
            const data = await res.json()
            if (data.documents) {
                setDocuments(data.documents)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoadingDocs(false)
        }
    }

    useEffect(() => {
        fetchDocuments()
    }, [])

    // Real-time polling when ingesting or uploading
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isIngesting || isUploading) {
            interval = setInterval(() => {
                fetchDocuments()
            }, 3000)
        }
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [isIngesting, isUploading])

    const processingCount = documents.filter(d => d.status === "PROCESSING").length
    const completedCount = documents.length // Total count as a proxy

    const handleScrapeUrl = async () => {
        if (!urlInput) return
        setIsIngesting(true)

        try {
            const res = await fetch("/api/admin/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "url", content: urlInput })
            })

            if (res.ok) {
                setUrlInput("")
                fetchDocuments() // Refresh the table
            } else {
                alert("Failed to ingest URL.")
            }
        } catch (error) {
            console.error("Ingest error:", error)
            alert("Error occurring during ingestion")
        } finally {
            setIsIngesting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this document?")) return;

        try {
            const res = await fetch(`/api/admin/documents/${id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                fetchDocuments() // Refresh the table
            } else {
                alert("Failed to delete document.");
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert("Error occurring during deletion.");
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append("file", file)

        try {
            const res = await fetch("/api/admin/upload", {
                method: "POST",
                body: formData
            })

            if (res.ok) {
                fetchDocuments() // Refresh the table
            } else {
                const data = await res.json()
                alert(`Failed to upload document: ${data.error || "Unknown error"}`)
            }
        } catch (error) {
            console.error("Upload error:", error)
            alert("Error occurring during upload.")
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = "" // Reset input
            }
        }
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Knowledge Base</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Manage all documents and URLs the AI uses to answer questions.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:shadow-md transition-shadow duration-300 border-t-4 border-t-yellow-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium">Add PDF/Document</CardTitle>
                        <CardDescription>Upload files like PDF, DOCX, TXT</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <input
                            type="file"
                            accept=".pdf, .txt, .png, .jpg, .jpeg"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                        />
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-6 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                        >
                            <div className="flex flex-col items-center gap-2 text-slate-500">
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
                                        <span className="text-sm font-medium">Uploading & Extracting...</span>
                                    </>
                                ) : (
                                    <>
                                        <FileText className="h-8 w-8 text-yellow-500" />
                                        <span className="text-sm font-medium">Click to upload (PDF, TXT, PNG, JPG)</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow duration-300 border-t-4 border-t-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium">Add Web URL</CardTitle>
                        <CardDescription>Scrape a website page for content</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="url">Website URL</Label>
                                <div className="flex gap-2">
                                    <Input id="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} disabled={isIngesting} placeholder="https://hidayahcentre.org.my/..." />
                                    <Button onClick={handleScrapeUrl} disabled={isIngesting || !urlInput} className="bg-blue-600 hover:bg-blue-700">
                                        {isIngesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                        {isIngesting ? `Processing...` : "Add"}
                                    </Button>
                                </div>
                                {isIngesting && (
                                    <p className="text-xs text-blue-600 font-medium animate-pulse mt-1">
                                        ⏱️ Scanning sitemap... You will see documents appearing in the table below as they are processed ({processingCount} currently in progress).
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow duration-300 border-t-4 border-t-red-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium">Add Video Link</CardTitle>
                        <CardDescription>Transcribe YouTube or MP4 links</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="video-url">Video URL</Label>
                                <div className="flex gap-2">
                                    <Input id="video-url" placeholder="https://youtube.com/watch?v=..." />
                                    <Button className="bg-red-600 hover:bg-red-700"><Video className="w-4 h-4 mr-2" /> Add</Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Sources</CardTitle>
                            <CardDescription>A list of all embedded documents in your system.</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <Input placeholder="Search documents..." className="pl-8 bg-white dark:bg-slate-950" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="mb-4">
                            <TabsTrigger value="all">All Sources</TabsTrigger>
                            <TabsTrigger value="documents">Files</TabsTrigger>
                            <TabsTrigger value="urls">URLs</TabsTrigger>
                            <TabsTrigger value="videos">Videos</TabsTrigger>
                        </TabsList>

                        <div className="rounded-md border bg-white dark:bg-slate-950">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingDocs ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-6 text-slate-500">Loading documents...</TableCell>
                                        </TableRow>
                                    ) : documents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-6 text-slate-500">No documents found. Add a URL above to start.</TableCell>
                                        </TableRow>
                                    ) : (
                                        documents.map((doc) => (
                                            <TableRow key={doc.id}>
                                                <TableCell className="font-medium flex items-center gap-2">
                                                    {doc.type === "pdf" && <FileText className="w-4 h-4 text-red-500" />}
                                                    {doc.type === "url" && <LinkIcon className="w-4 h-4 text-blue-500" />}
                                                    {doc.type === "video" && <Video className="w-4 h-4 text-red-600" />}
                                                    {doc.type === "txt" && <FileText className="w-4 h-4 text-slate-500" />}
                                                    {(doc.type === "png" || doc.type === "jpg" || doc.type === "jpeg") && <ImageIcon className="w-4 h-4 text-purple-500" />}
                                                    {doc.title}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="uppercase text-xs">{doc.type}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={doc.status === "COMPLETED" ? "default" : "secondary"}
                                                        className={doc.status === "COMPLETED" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-500 hover:bg-amber-600 text-white"}>
                                                        {doc.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button onClick={() => handleDelete(doc.id)} variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
