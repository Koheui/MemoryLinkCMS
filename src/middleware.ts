// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - p (public pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|p|.*\\.png$).*)',
  ],
};

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value;
  const { pathname } = request.nextUrl;

  const publicPaths = ['/login', '/signup', '/'];

  const isPublicPath = publicPaths.includes(pathname);

  // If user is authenticated
  if (sessionCookie) {
    // If they are trying to access a public-only path like login, redirect them to account
    if (isPublicPath) {
      return NextResponse.redirect(new URL('/account', request.url));
    }
    // Otherwise, allow them to proceed
    return NextResponse.next();
  }

  // If user is not authenticated
  // If they are trying to access a protected path, redirect them to login
  if (!isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Otherwise, allow them to access the public path
  return NextResponse.next();
}
