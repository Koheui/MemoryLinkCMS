// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  // Define paths that are always public, regardless of auth state.
  const publicPaths = ['/login', '/signup', '/']
  if (publicPaths.includes(pathname) || pathname.startsWith('/p/')) {
    return NextResponse.next()
  }

  // Let static assets and API routes pass through without checks.
  // This is a common pattern to avoid interfering with Next.js internals.
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.endsWith('favicon.ico')) {
    return NextResponse.next()
  }

  // For any other path, it is considered a protected route.
  // If there is no session cookie, redirect to the login page.
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url)
    // You can optionally add a `next` query parameter to redirect back after login.
    // loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If there is a session cookie, allow access to the protected route.
  // The validity of the cookie itself will be checked on the page/component level.
  return NextResponse.next()
}

// Matcher to define which routes are affected by this middleware.
export const config = {
  matcher: [
    // This matcher is crucial. It ensures the middleware runs on every request
    // except for those that are explicitly for static assets.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
