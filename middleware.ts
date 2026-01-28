import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    try {
      // Get session token from cookie
      const sessionToken = request.cookies.get('better-auth.session_token')

      if (!sessionToken) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
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
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }

      const session = await response.json()

      if (!session || !session.user) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }

      // Check if user is admin
      const isUserAdmin = checkIsAdmin(session.user)

      if (!isUserAdmin) {
        // Redirect to unauthorized page
        return NextResponse.redirect(new URL('/auth/unauthorized', request.url))
      }
    } catch (error) {
      console.error('Middleware error:', error)
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return NextResponse.next()
}

/**
 * Check if user is admin based on role or email whitelist
 */
function checkIsAdmin(user: { email: string; role?: string }): boolean {
  // Method 1: Check role field
  if (user.role === 'admin') {
    return true
  }

  // Method 2: Check email whitelist
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((email) =>
    email.trim().toLowerCase()
  )

  if (adminEmails && adminEmails.length > 0) {
    return adminEmails.includes(user.email.toLowerCase())
  }

  return false
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
