// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  const isAuthenticated = !!sessionCookie;

  const isAuthPage = ['/login', '/signup'].includes(pathname);
  
  // If user is authenticated
  if (isAuthenticated) {
    // If they are on an auth page (login, signup) or the root, redirect them to a safe page.
    if (isAuthPage || pathname === '/') {
      return NextResponse.redirect(new URL('/account', request.url));
    }
  } 
  // If user is not authenticated
  else {
    const isPublicPath = isAuthPage || pathname === '/';
    // And they are trying to access a protected route, redirect to login.
    if (!isPublicPath) {
       return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}

// Matcher to define which routes are affected by this middleware
export const config = {
  matcher: [
    // Match all routes except for API routes, static files, and the public page route
    '/((?!api|_next/static|_next/image|favicon.ico|p).*)',
  ],
}
