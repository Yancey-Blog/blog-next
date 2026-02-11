import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from './lib/auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect /admin routes - only whitelisted emails can access
  if (pathname.startsWith('/admin')) {
    try {
      // Get session token from cookie
      const session = await auth.api.getSession({
        headers: await headers()
      })

      if (!session) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      if (!session || !session.user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Check if user email is in whitelist
      if (!isAdminEmail(session.user.email) || !session.user.emailVerified) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    } catch (error) {
      console.error('Proxy error:', error)
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

/**
 * Check if email is in ADMIN_EMAILS whitelist
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false

  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) =>
    e.trim().toLowerCase()
  )

  return adminEmails?.includes(email.toLowerCase()) ?? false
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|auth).*)'
  ]
}
