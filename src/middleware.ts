// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  // Define public paths that don't require authentication
  const isPublicPath = ['/login', '/signup', '/'].includes(pathname) || pathname.startsWith('/p/');

  // Let static files and API routes pass through
  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // If there's a session cookie
  if (sessionCookie) {
    // If user is authenticated and tries to access a public path like login/signup, redirect them
    if (isPublicPath && !pathname.startsWith('/p/')) {
       // Redirect to a default authenticated page.
      return NextResponse.redirect(new URL('/account', request.url))
    }
    // Allow access to other pages
    return NextResponse.next()
  }

  // If there's no session cookie and the path is not public, redirect to login
  if (!sessionCookie && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Allow access to public pages if no session
  return NextResponse.next()
}

// Matcher to define which routes are affected by this middleware
export const config = {
  matcher: [
    // Match all routes except for API routes, static files, and image optimization files.
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
