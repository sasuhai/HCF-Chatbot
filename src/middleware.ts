import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Check if the request is for the admin area
    if (pathname.startsWith('/admin')) {
        const session = request.cookies.get('admin_session')

        // If no session exists, redirect to login page
        if (!session || session.value !== 'authenticated') {
            const loginUrl = new URL('/login', request.url)
            loginUrl.searchParams.set('from', pathname)
            return NextResponse.redirect(loginUrl)
        }
    }

    return NextResponse.next()
}

// Config for matching paths
export const config = {
    matcher: ['/admin', '/admin/:path*'],
}
