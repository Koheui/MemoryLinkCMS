
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

  // Case 1: User is not authenticated and tries to access a protected route
  // Redirect them to the login page.
  if (!sessionCookie && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Case 2: User is authenticated and tries to access an auth route (login/signup)
  // Redirect them to the dashboard.
  if (sessionCookie && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Case 3: All other cases (e.g., authenticated user accessing protected route,
  // or any user accessing a public route), allow the request to proceed.
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
