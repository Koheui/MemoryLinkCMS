// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  // Assume unauthenticated if no cookie
  if (!sessionCookie) {
    const isProtectedRoute = ['/memories', '/media-library', '/account', '/_admin', '/dashboard'].some((path) =>
        pathname.startsWith(path)
    );
    if (isProtectedRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Verify the session cookie by calling our new API route
  const response = await fetch(new URL('/api/auth/verify', request.url), {
    headers: {
      'Cookie': `__session=${sessionCookie}`
    }
  });

  const { isAuthenticated } = await response.json();

  if (isAuthenticated) {
    // If authenticated, redirect from public-only pages to the dashboard
    if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
       return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } else {
    // If not authenticated, redirect from protected pages to login
    const isProtectedRoute = ['/memories', '/media-library', '/account', '/_admin', '/dashboard'].some((path) =>
        pathname.startsWith(path)
    );
    if (isProtectedRoute) {
        // Clear the invalid cookie
        const res = NextResponse.redirect(new URL('/login', request.url));
        res.cookies.set('__session', '', { maxAge: -1 });
        return res;
    }
  }
  
  return NextResponse.next();
}

// Matcher remains the same
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|p).*)',
  ],
}
