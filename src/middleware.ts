
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  const isProtectedRoute = ['/dashboard', '/memories', '/_admin'].some((path) =>
    pathname.startsWith(path)
  );
  
  const isAuthRoute = ['/login', '/signup'].some((path) =>
    pathname.startsWith(path)
  );

  // If user is not authenticated (no session cookie) and tries to access a protected route, redirect to login
  if (!sessionCookie && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is authenticated (has session cookie) and tries to access login or signup page, redirect to dashboard
  if (sessionCookie && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes, we want to protect them individually)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - p (public pages)
     * - debug-token (the debug page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|p|debug-token).*)',
  ],
}
