import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
    const { password } = await request.json()

    if (password === process.env.ADMIN_PASSWORD) {
        // Set a session cookie
        const cookieStore = await cookies()
        cookieStore.set('admin_session', 'authenticated', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 24 hours
            path: '/',
        })

        return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, message: 'Invalid password' }, { status: 401 })
}
