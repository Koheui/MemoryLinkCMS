// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';

const PROTECTED_PATHS = ['/dashboard', '/memories'];
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
    await getAuth().verifySessionCookie(cookie, true);
    return true;
  } catch (error) {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  const isLoggedIn = await verifySession(sessionCookie);

  const isProtectedRoute = PROTECTED_PATHS.some(path => pathname.startsWith(path));
  const isAdminRoute = pathname.startsWith('/_admin');
  const isAuthRoute = AUTH_PATHS.some(path => pathname.startsWith(path));

  // If not logged in and trying to access a protected route, redirect to login
  if (!isLoggedIn && (isProtectedRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If logged in and trying to access an auth route, redirect to dashboard
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

// Match all paths except for API routes, static files, and image optimization files.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|p|debug-token|.*\\..*).*)'],
}