import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // This middleware is only for obscuring the admin path if a session cookie is not present.
  // The actual authentication check is done in the AdminLayout server component.
  if (req.nextUrl.pathname.startsWith("/_admin")) {
    const hasSession = !!req.cookies.get("__session")?.value;
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = '/404';
      return NextResponse.rewrite(url);
    }
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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
