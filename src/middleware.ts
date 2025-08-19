
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase-admin/firestore';

export const config = {
  // Use Node.js runtime to leverage firebase-admin
  runtime: 'nodejs', 
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - p (public pages)
     * - login, signup, / (public marketing pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|p|login|signup|auth-form|/$).*)',
  ],
};

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value;
  const { pathname } = request.nextUrl;

  if (!sessionCookie) {
    // If no session, and they are trying to access a protected route, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If there's a cookie, verify it
  try {
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    
    // If the user is authenticated and tries to access the special '/pages' route,
    // find their memoryId and redirect them to their editor.
    if (pathname === '/pages') {
        const db = getFirestore(adminApp);
        const uid = decodedClaims.uid;
        
        const memoriesQuery = query(
            collection(db, 'memories'), 
            where('ownerUid', '==', uid), 
            limit(1)
        );
        const querySnapshot = await getDocs(memoriesQuery);

        if (!querySnapshot.empty) {
            const memoryId = querySnapshot.docs[0].id;
            return NextResponse.redirect(new URL(`/memories/${memoryId}`, request.url));
        } else {
             console.warn(`Middleware: No memory found for user ${uid}, redirecting to /account`);
             return NextResponse.redirect(new URL('/account', request.url));
        }
    }
    
    // For any other authenticated route, allow access.
    return NextResponse.next();

  } catch (error) {
    // Session cookie is invalid or expired.
    console.error('Middleware auth error:', error);
    // Clear the invalid cookie and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('__session', '', { maxAge: -1 });
    return response;
  }
}
