
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.cookies.get('firebase-auth-token-cookie-name-placeholder'); // Placeholder, actual check happens client-side

  // These pages are for unauthenticated users
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
  
  if (isAuthPage) {
    // If the user is logged in, redirect them away from auth pages
    if (isLoggedIn) {
       // This redirect is speculative, client-side will confirm and redirect if needed
    }
    return NextResponse.next();
  }

  // All other pages under /app require auth
  if (!isLoggedIn && pathname.startsWith('/dashboard') || pathname.startsWith('/memories')) {
      // If user is not logged in and tries to access a protected page, redirect to login
      return NextResponse.redirect(new URL('/login', req.url));
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
     * - public assets like images
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
