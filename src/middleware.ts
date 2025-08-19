// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('__session')?.value;

  // Define paths that are always public, regardless of auth state.
  const publicPaths = ['/login', '/signup', '/'];
  if (publicPaths.includes(pathname) || pathname.startsWith('/p/')) {
    // If user is authenticated and tries to access login/signup, redirect them.
    if (sessionCookie && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/account', request.url));
    }
    return NextResponse.next();
  }

  // Let static assets and internal Next.js routes pass through without checks.
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.endsWith('.ico')) {
    return NextResponse.next();
  }

  // For any other path, it is considered a protected route.
  // If there is no session cookie, redirect to the login page.
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If there is a session cookie, allow access to the protected route.
  // The validity of the cookie itself will be checked on the page/component level via useAuth hook.
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
