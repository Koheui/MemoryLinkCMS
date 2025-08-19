
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // api, static files, debug pages, etc. should be skipped
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname.startsWith("/debug-token") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // This middleware is only for obscuring the admin path if a session cookie is not present.
  // The actual authentication check is done in the AdminLayout server component.
  if (pathname.startsWith("/_admin")) {
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
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
