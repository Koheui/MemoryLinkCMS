
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  // Early exit for API routes, static files, etc.
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // Check for authentication status via API route. Use absolute URL for fetch in middleware.
  const verifyUrl = new URL('/api/auth/verify', request.url);
  const authResponse = await fetch(verifyUrl.toString(), {
    headers: {
      'Cookie': `__session=${sessionCookie || ''}`
    }
  });
  
  const { isAuthenticated } = await authResponse.json();

  const isPublicPath = ['/login', '/signup', '/'].includes(pathname);
  const isProtectedRoute = !isPublicPath;

  // If user is authenticated and on a public page (login, signup, root), redirect to dashboard.
  if (isAuthenticated && isPublicPath) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If user is not authenticated and trying to access a protected route, redirect to login.
  if (!isAuthenticated && isProtectedRoute) {
      const res = NextResponse.redirect(new URL('/login', request.url));
      // Clear the invalid cookie if it exists to prevent redirect loops
      if (sessionCookie) {
          res.cookies.set('__session', '', { maxAge: -1 });
      }
      return res;
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
