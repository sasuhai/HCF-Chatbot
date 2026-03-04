import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Pinecone } from "@pinecone-database/pinecone"

const pinecone = new Pinecone()

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        if (!id) {
            return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
        }

        // 1. Delete the embeddings from Pinecone using the document ID as metadata matching
        // This ensures the AI no longer references this data in its context
        try {
            const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!)
            await pineconeIndex.deleteMany({
                filter: {
                    docId: id
                }
            })
        } catch (pineconeError) {
            // We log but don't fail here, as we still want to remove the DB record 
            // even if Pinecone cleanup has an issue
            console.error("Pinecone Deletion Error:", pineconeError)
        }

        // 2. Delete from MySQL Database
        await prisma.document.delete({
            where: { id: id }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Delete Document Error:", error)
        return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
    }
}
