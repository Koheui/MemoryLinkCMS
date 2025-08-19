
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { getFirestore } from 'firebase-admin/firestore';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  // Verify the session cookie.
  // Using a try-catch block is a reliable way to handle invalid/expired cookies.
  let decodedClaims = null;
  if (sessionCookie) {
    try {
        const app = getAdminApp();
        decodedClaims = await getAuth(app).verifySessionCookie(sessionCookie, true);
    } catch (error) {
        // Session cookie is invalid. Clear it.
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.set('__session', '', { maxAge: -1 });
        return response;
    }
  }
  
  const isAuthenticated = !!decodedClaims;

  const isPublicPath = ['/login', '/signup', '/'].includes(pathname);
  
  // If user is authenticated
  if (isAuthenticated) {
    // If they are on a public page (login, signup, root), redirect them to the dashboard.
    if (isPublicPath) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } 
  // If user is not authenticated
  else {
    // And they are trying to access a protected route, redirect to login.
    if (!isPublicPath) {
       return NextResponse.redirect(new URL('/login', request.url));
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
