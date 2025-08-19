// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

async function getFirstMemoryId(uid: string): Promise<string | null> {
    try {
        const adminApp = getAdminApp();
        const db = getFirestore(adminApp);
        
        const memoriesCollectionRef = db.collection('memories');
        const querySnapshot = await memoriesCollectionRef.where('ownerUid', '==', uid).limit(1).get();

        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].id;
        }
        return null;
    } catch (error) {
        console.error("Error fetching first memory ID in middleware:", error);
        return null;
    }
}


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  // Check for authentication status via API route
  const authResponse = await fetch(new URL('/api/auth/verify', request.url), {
    headers: {
      'Cookie': `__session=${sessionCookie || ''}`
    }
  });
  const { isAuthenticated, uid } = await authResponse.json();

  const isProtectedRoute = ['/memories', '/media-library', '/account', '/_admin', '/dashboard'].some((path) =>
    pathname.startsWith(path)
  );

  if (isAuthenticated && uid) {
    if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
        const memoryId = await getFirstMemoryId(uid);
        if (memoryId) {
            return NextResponse.redirect(new URL(`/memories/${memoryId}`, request.url));
        }
        // If no memoryId, redirect to a safe page like account
        return NextResponse.redirect(new URL('/account', request.url));
    }
    // If user is authenticated and tries to go to dashboard, redirect them to their memory page
    if (pathname === '/dashboard') {
        const memoryId = await getFirstMemoryId(uid);
        if (memoryId) {
            return NextResponse.redirect(new URL(`/memories/${memoryId}`, request.url));
        }
        return NextResponse.redirect(new URL('/account', request.url));
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