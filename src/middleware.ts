// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/dashboard', '/memories'];
const AUTH_PATHS = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // Check for a simple login indicator cookie.
  const isLoggedIn = request.cookies.get('isLoggedIn')?.value === 'true'

  const isProtectedRoute = PROTECTED_PATHS.some(path => pathname.startsWith(path));
  const isAuthRoute = AUTH_PATHS.some(path => pathname.startsWith(path));

  if (!isLoggedIn && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|p|debug-token).*)'],
}
