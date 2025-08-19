
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  // If user is authenticated, redirect from root to /pages.
  // If not, let them stay on the public landing page (which is now page.tsx at root)
  // or redirect from auth routes to /pages.
  if (sessionCookie) {
    if (pathname === '/login' || pathname === '/signup') {
      return NextResponse.redirect(new URL('/pages', request.url))
    }
  }

  const isProtectedRoute = ['/pages', '/memories', '/media-library', '/account', '/_admin'].some((path) =>
    pathname.startsWith(path)
  );

  // If user is not authenticated and tries to access a protected route,
  // redirect them to the login page.
  if (!sessionCookie && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Allow the request to proceed for all other cases.
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
