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

  if (isAuthenticated) {
    // If authenticated, redirect from public-only pages to the user's single memory page.
    // The dashboard is now just a loading state to get the memoryId.
    if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
       // We let the dashboard handle the final redirect to /memories/[id]
       return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } else {
    // If not authenticated, redirect from protected pages to login
    if (isProtectedRoute) {
        const res = NextResponse.redirect(new URL('/login', request.url));
        // Clear the invalid cookie if it exists to prevent redirect loops
        if (sessionCookie) {
            res.cookies.set('__session', '', { maxAge: -1 });
        }
        return res;
    }
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
