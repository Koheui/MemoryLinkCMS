
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  // Check for authentication status via API route
  const authResponse = await fetch(new URL('/api/auth/verify', request.url), {
    headers: {
      'Cookie': `__session=${sessionCookie || ''}`
    }
  });
  const { isAuthenticated } = await authResponse.json();

  const isProtectedRoute = ['/memories', '/media-library', '/account', '/_admin', '/dashboard'].some((path) =>
    pathname.startsWith(path)
  );

  // If user is authenticated and on login/signup, redirect to dashboard.
  // The dashboard will then handle the redirect to the specific memory page.
  if (isAuthenticated && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
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
