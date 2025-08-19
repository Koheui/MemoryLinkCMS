
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs'

async function getFirstMemoryId(uid: string): Promise<string | null> {
    try {
        const app = getAdminApp();
        const db = getFirestore(app);
        
        // Corrected query syntax for firebase-admin SDK
        const memoriesCollectionRef = db.collection('memories');
        const querySnapshot = await memoriesCollectionRef
            .where('ownerUid', '==', uid)
            .limit(1)
            .get();

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
    // If trying to access login/signup, redirect to their memory page
    if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
       const memoryId = await getFirstMemoryId(decodedClaims.uid);
       if (memoryId) {
            return NextResponse.redirect(new URL(`/memories/${memoryId}`, request.url));
       }
       // This case should be rare if signup creates a page, but as a fallback:
       return NextResponse.redirect(new URL('/account', request.url));
    }
    
    // Allow access to other protected routes
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
// We remove the config object to allow the runtime export to take effect.
// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except for the ones starting with:
//      * - api (API routes)
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      * - p (public pages)
//      */
//     '/((?!api|_next/static|_next/image|favicon.ico|p).*)',
//   ],
// }
