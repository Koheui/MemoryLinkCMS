// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// These paths are protected and require authentication
const PROTECTED_PATHS = ['/dashboard', '/memories'];
// These paths are related to authentication and should not be accessed by logged-in users
const AUTH_PATHS = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  // Clone the request headers to avoid modifying the original
  const headers = new Headers(request.headers)
  headers.set('x-url', request.url)

  // Call internal API to verify the session
  // We use an absolute URL because middleware can run in a different context
  const verificationUrl = new URL('/api/auth/verify', request.url);
  const response = await fetch(verificationUrl, {
    headers: {
      Cookie: `__session=${sessionCookie || ''}`
    }
  });
  
  const { isAuthenticated } = await response.json();

  const isProtectedRoute = PROTECTED_PATHS.some(path => pathname.startsWith(path));

  // If user is not authenticated and is trying to access a protected route
  if (!isAuthenticated && isProtectedRoute) {
    // Redirect them to the login page
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const isAuthRoute = AUTH_PATHS.some(path => pathname.startsWith(path));

  // If user is authenticated and is trying to access login/signup page
  if (isAuthenticated && isAuthRoute) {
    // Redirect them to the dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Allow the request to proceed
  return NextResponse.next({
    request: {
      headers: headers,
    },
  })
}

export const config = {
  // Match all request paths except for the ones starting with:
  // - api (API routes)
  // - _next/static (static files)
  // - _next/image (image optimization files)
  // - favicon.ico (favicon file)
  // - p (public memory pages)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|p).*)'],
}
