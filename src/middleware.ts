
import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin SDK
getAdminApp();

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get("__session")?.value || "";

  // Helper function to check if the session is valid
  const checkSession = async () => {
    if (!sessionCookie) return null;
    try {
      // Using checkRevoked: true is crucial for security
      const decodedClaims = await getAuth().verifySessionCookie(sessionCookie, true);
      return decodedClaims;
    } catch (error) {
      // Session cookie is invalid or revoked.
      return null;
    }
  };

  const decodedClaims = await checkSession();
  const isLoggedIn = !!decodedClaims;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isAppPage = pathname.startsWith('/dashboard') || pathname.startsWith('/memories');
  const isAdminPage = pathname.startsWith('/_admin');

  if (isAuthPage) {
    if (isLoggedIn) {
      // If logged in, redirect from auth pages to dashboard
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    // Not logged in, allow access to auth page
    return NextResponse.next();
  }

  if (isAppPage || isAdminPage) {
    if (!isLoggedIn) {
       // If not logged in, redirect from app/admin pages to login
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // If trying to access admin page without admin role, show 404
    if (isAdminPage && decodedClaims.role !== 'admin') {
      const url = req.nextUrl.clone();
      url.pathname = '/404'; // Rewrite to a 404 page to obscure the path
      return NextResponse.rewrite(url);
    }

    // User is logged in and has permission, allow access
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = { 
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|debug-token).*)',
  ],
};
