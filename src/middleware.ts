
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  // Redirect from root to /pages if authenticated, or /login if not.
  if (pathname === '/') {
    const url = sessionCookie ? '/pages' : '/login';
    return NextResponse.redirect(new URL(url, request.url))
  }
  
  const isProtectedRoute = ['/pages', '/memories', '/media-library', '/account', '/_admin'].some((path) =>
    pathname.startsWith(path)
  );
  
  const isAuthRoute = ['/login', '/signup'].some((path) =>
    pathname.startsWith(path)
  );

  // Case 1: User is not authenticated and tries to access a protected route
  // Redirect them to the login page.
  if (!sessionCookie && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Case 2: User is authenticated and tries to access an auth route (login/signup)
  // Redirect them to the main pages list.
  if (sessionCookie && isAuthRoute) {
    return NextResponse.redirect(new URL('/pages', request.url))
  }

  // Case 3: All other cases (e.g., authenticated user accessing protected route,
  // or any user accessing a public route), allow the request to proceed.
  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/',
    '/pages/:path*',
    '/memories/:path*',
    '/media-library/:path*',
    '/account/:path*',
    '/_admin/:path*',
    '/login',
    '/signup',
  ],
}
