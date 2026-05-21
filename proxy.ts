import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from './lib/auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Meiji cat site: meiji.yanceyleo.com (and meiji.localhost in dev) is served
  // from the same project. Rewrite its requests into the app/meiji/* route
  // group so the address bar stays clean, and keep the cat host away from the
  // admin. /api is excluded by the matcher, so tRPC stays shared and unrewritten.
  const host = request.headers.get('host') ?? ''
  const hostname = host.split(':')[0]
  const isLocalHost =
    hostname === 'localhost' || hostname.endsWith('.localhost')
  const isMeijiHost =
    hostname === 'meiji.yanceyleo.com' || hostname === 'meiji.localhost'
  if (isMeijiHost) {
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    if (!pathname.startsWith('/meiji')) {
      const url = request.nextUrl.clone()
      url.pathname = pathname === '/' ? '/meiji' : `/meiji${pathname}`
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  // On the main domain, /meiji* is the cat site — redirect to its own
  // subdomain (canonical), preserving any sub-path and query.
  if (pathname === '/meiji' || pathname.startsWith('/meiji/')) {
    const meijiHost = isLocalHost
      ? 'meiji.localhost'
      : `meiji.${hostname.replace(/^www\./, '')}`
    const port = host.split(':')[1]
    const proto = isLocalHost ? 'http' : 'https'
    const rest = pathname.slice('/meiji'.length) || '/'
    return NextResponse.redirect(
      `${proto}://${meijiHost}${port ? `:${port}` : ''}${rest}${request.nextUrl.search}`,
      308
    )
  }

  // Protect /admin routes - only whitelisted emails can access
  if (pathname.startsWith('/admin')) {
    try {
      // Get session token from cookie
      const session = await auth.api.getSession({
        headers: await headers()
      })

      if (!session?.user) {
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
