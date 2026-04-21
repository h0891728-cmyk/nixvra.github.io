/**
 * NIXVRA - Next.js 16 Proxy (formerly Middleware)
 *
 * Responsibilities:
 * 1. Subdomain routing — rewrite *.localhost / *.nixvra.online traffic to /[domain]
 * 2. Protect all dashboard routes — redirect unauthenticated users to /login
 * 3. Refresh session token on every verified request (sliding expiry)
 * 4. Inject tenant context headers (x-tenant-id, x-user-role) for Server Components
 *
 * NOTE: In Next.js 16, this file is proxy.ts and the export must be named `proxy`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { decrypt, updateSession } from '@/lib/session'

// Routes that do NOT require authentication
const PUBLIC_PATHS = ['/', '/landing', '/login', '/api/auth/login', '/api/webhooks']

// Routes protected by auth — never accessible from public subdomain
const PROTECTED_PREFIXES = ['/super-admin', '/dashboard', '/api', '/login']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

// ── Helpers ──────────────────────────────────────────────────────

function extractSubdomain(hostname: string): string | null {
  // Dev:  sunrise-academy.localhost:3000 → "sunrise-academy"
  // Prod: sunrise-academy.nixvra.online   → "sunrise-academy"
  const isLocalhost = hostname.includes('localhost')
  const isProd = hostname.endsWith('.nixvra.online')

  if (isLocalhost) {
    const raw = hostname.split(':')[0] // strip port
    const parts = raw.split('.')
    if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== 'www') {
      return parts[0]
    }
  } else if (isProd) {
    const parts = hostname.split('.')
    // ["sunrise-academy", "nixvra", "com"]
    if (parts.length >= 3) return parts[0]
  }

  return null
}

// ── Main Proxy ───────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // ── 1. Subdomain routing (public tenant landing pages) ──
  const subdomain = extractSubdomain(hostname)

  if (subdomain) {
    // Block protected routes from being accessed via public subdomain
    const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
    if (isProtected) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Rewrite to /[domain]/... e.g. /sunrise-academy/about
    const url = request.nextUrl.clone()
    url.pathname = `/${subdomain}${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  // ── 2. Standard app auth guard (no subdomain) ──
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Read session token
  const token =
    request.cookies.get('nixvra_session')?.value ??
    request.cookies.get('omnicore_session')?.value
  const session = await decrypt(token)

  // Redirect unauthenticated users to login
  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Inject tenant context as request headers so Server Components can read them
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-id', session.tenantId)
  requestHeaders.set('x-user-id', session.userId)
  requestHeaders.set('x-user-role', session.role)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Refresh the session cookie (sliding expiry)
  await updateSession()

  return response
}

export const config = {
  // Run proxy on all routes except Next.js internals and static files
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
