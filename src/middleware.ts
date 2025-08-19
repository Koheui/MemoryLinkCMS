// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase-admin/firestore';

export const config = {
  // Use nodejs runtime to enable firebase-admin
  runtime: 'nodejs',
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - / (the root page, which is public)
     * - /login, /signup (auth pages)
     * - /p/ (public memory pages)
     */
    '/((?!_next/static|_next/image|favicon.ico|login|signup|p/|$).*)',
  ],
};

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value;

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    getAdminApp();
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie, true);
    
    // Handle the special /pages route from auth-form
    if (request.nextUrl.pathname === '/pages') {
        const db = getFirestore();
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
            // If no memory page found, redirect to account as a fallback.
            // A more robust app might redirect to a "create your first memory" page.
            console.warn(`No memory found for user ${decodedClaims.uid}, redirecting to /account`);
            return NextResponse.redirect(new URL('/account', request.url));
        }
    }
    
    return NextResponse.next();

  } catch (error) {
    // Session cookie is invalid, expired, or revoked.
    console.error('Middleware auth error:', error);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    // Clear the invalid cookie
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set('__session', '', { maxAge: -1, path: '/' });
    return response;
  }
}
