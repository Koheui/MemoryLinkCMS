// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  const isLoggedIn = !!sessionCookie

  const isProtectedRoute = ['/dashboard', '/memories', '/_admin'].some((path) =>
    pathname.startsWith(path)
  )
  
  const isAuthRoute = ['/login', '/signup'].some((path) =>
    pathname.startsWith(path)
  )

  // If user is not logged in and tries to access a protected route, redirect to login
  if (!isLoggedIn && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is logged in and tries to access login or signup page, redirect to dashboard
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - p (public pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|p).*)',
  ],
}
