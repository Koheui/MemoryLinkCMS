// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { collection, query, where, getDocs, limit, getFirestore } from 'firebase/admin/firestore';


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value

  // Define public paths that don't require authentication
  const isPublicPath = ['/login', '/signup', '/'].includes(pathname);

  // If there's no session cookie and the path is not public, redirect to login
  if (!sessionCookie && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If there is a session cookie
  if (sessionCookie) {
    try {
      // Initialize admin app and verify the session cookie
      const app = getAdminApp();
      const decodedClaims = await getAuth(app).verifySessionCookie(sessionCookie, true);
      
      // If user is authenticated and tries to access a public path (login, signup, root), redirect
      if (isPublicPath) {
         return NextResponse.redirect(new URL('/pages', request.url));
      }

      // If the user is authenticated and trying to access the special '/pages' route
      if (pathname === '/pages') {
        const db = getFirestore(app);
        const memoriesQuery = query(
            collection(db, 'memories'), 
            where('ownerUid', '==', decodedClaims.uid), 
            limit(1)
        );
        const querySnapshot = await getDocs(memoriesQuery);

        if (!querySnapshot.empty) {
            const memoryId = querySnapshot.docs[0].id;
            return NextResponse.redirect(new URL(`/memories/${memoryId}`, request.url));
        } else {
             // If no memory found, redirect to account page as a fallback.
             // This might happen for a new user if the memory creation is delayed.
             return NextResponse.redirect(new URL('/account', request.url));
        }
      }

    } catch (error) {
        // If cookie is invalid (expired, revoked, etc.), clear it and redirect to login
        console.error('Session cookie verification failed:', error);
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.set('__session', '', { maxAge: -1, path: '/' });
        return response;
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
