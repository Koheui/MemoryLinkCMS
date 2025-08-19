// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';

const PROTECTED_PATHS = ['/dashboard', '/memories', '/_admin'];
const AUTH_PATHS = ['/login', '/signup'];

// Initialize admin app outside of the middleware function
try {
  getAdminApp();
} catch (e) {
  console.error('Failed to initialize Firebase Admin SDK in middleware:', e);
}


async function verifySession(cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false;
  try {
    // getAuth() might fail if the admin app is not initialized
    const auth = getAuth();
    await auth.verifySessionCookie(cookie, true);
    return true;
  } catch (error) {
    // This will catch errors from verifySessionCookie and getAuth() if initialization failed
    // console.error("Session verification failed:", error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  const isLoggedIn = await verifySession(sessionCookie);

  const isProtectedRoute = PROTECTED_PATHS.some(path => pathname.startsWith(path));
  const isAuthRoute = AUTH_PATHS.some(path => pathname.startsWith(path));

  // If not logged in and trying to access a protected route, redirect to login
  if (!isLoggedIn && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If logged in and trying to access an auth route, redirect to dashboard
  if (isLoggedIn && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// Match all paths except for API routes, static files, and image optimization files.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|p|debug-token|.*\\..*).*)'],
  runtime: 'nodejs', // Specify the Node.js runtime
}
