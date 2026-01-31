import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect /admin routes - only whitelisted emails can access
  if (pathname.startsWith('/admin')) {
    try {
      // Get session token from cookie
      const sessionToken = request.cookies.get('better-auth.session_token')

      if (!sessionToken) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Verify session
      const response = await fetch(
        new URL('/api/auth/get-session', request.url),
        {
          headers: {
            cookie: request.headers.get('cookie') || ''
          }
        }
      )

      if (!response.ok) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      const session = await response.json()

      if (!session || !session.user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Check if user email is in whitelist
      if (!isAdminEmail(session.user.email)) {
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
function isAdminEmail(email: string | null | undefined): boolean {
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
