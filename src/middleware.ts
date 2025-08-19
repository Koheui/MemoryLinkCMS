
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get("__session")?.value;

  const isLoggedIn = !!sessionCookie;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
  // Middleware should protect all authenticated routes
  const isAppPage = !isAuthPage && pathname !== '/' && !pathname.startsWith('/p/');
  
  if (isAuthPage) {
    if (isLoggedIn) {
      // If logged in, redirect from auth pages to the dashboard
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    // If not logged in, allow access to auth pages
    return NextResponse.next();
  }

  if (isAppPage) {
    if (!isLoggedIn) {
      // If not logged in, redirect from app pages to login
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }
  
  // The middleware now only handles redirection based on cookie presence.
  // Verification of the cookie's validity is handled in server components
  // or API routes that run in the Node.js runtime.
  
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
