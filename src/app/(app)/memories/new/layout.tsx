// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { collection, query, where, getDocs, limit, getFirestore } from 'firebase-admin/firestore';


async function getFirstMemoryId(uid: string): Promise<string | null> {
    try {
        const app = getAdminApp();
        const db = getFirestore(app);
        const memoriesCollectionRef = db.collection('memories');
        const q = query(memoriesCollectionRef, where('ownerUid', '==', uid), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].id;
        }
        return null;
    } catch (error) {
        console.error("Middleware: Failed to fetch memory ID:", error);
        return null;
    }
}


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  let decodedClaims;
  if (sessionCookie) {
    try {
        getAdminApp();
        decodedClaims = await getAuth().verifySessionCookie(sessionCookie, true);
    } catch (error) {
        // Invalid cookie, clear it and proceed as unauthenticated
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.set('__session', '', { maxAge: -1 });
        return response;
    }
  }

  // If user is authenticated
  if (decodedClaims) {
    if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
       const memoryId = await getFirstMemoryId(decodedClaims.uid);
       if (memoryId) {
            return NextResponse.redirect(new URL(`/memories/${memoryId}`, request.url));
       }
       // If user has no page yet, maybe redirect to a creation page or show an error.
       // For now, we'll let them land on a generic (but protected) page.
       // A dedicated "create your page" route would be better.
       return NextResponse.redirect(new URL('/account', request.url)); // Fallback redirect
    }
    
    // Allow access to protected routes
    return NextResponse.next();
  }

  // If user is NOT authenticated
  const isProtectedRoute = ['/memories', '/media-library', '/account', '/_admin'].some((path) =>
    pathname.startsWith(path)
  );

  if (isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Allow access to public pages like /, /login, /signup, /p/*
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - p (public pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|p).*)',
  ],
}