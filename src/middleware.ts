// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('__session')?.value;

  // Define paths that are always public
  const publicPaths = ['/login', '/signup', '/'];
  if (publicPaths.includes(pathname) || pathname.startsWith('/p/')) {
    // If a logged-in user tries to access login/signup, redirect them to a protected page
    if (sessionCookie && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/account', request.url));
    }
    // Otherwise, allow access to public paths
    return NextResponse.next();
  }

  // Let static assets and internal Next.js routes pass through without checks.
  // This is a common pattern to avoid running middleware on static files.
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.endsWith('.ico')) {
    return NextResponse.next();
  }

  // At this point, all remaining paths are considered protected.
  // If there is no session cookie, redirect to the login page.
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    // Store the intended destination to redirect back after login
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If there is a session cookie, allow access to the protected route.
  // The validity of the cookie itself is checked on the client-side (useAuth) and server-side (API routes).
  return NextResponse.next();
}

// Matcher to define which routes are affected by this middleware.
export const config = {
  matcher: [
    // This matcher is crucial. It ensures the middleware runs on every request
    // except for those that are explicitly for static assets.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
