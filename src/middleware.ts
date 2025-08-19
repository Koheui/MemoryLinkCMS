// src/middleware.ts
// This file is intentionally left almost empty to disable Next.js middleware functionality
// while still satisfying the build requirement for the file to export a function.
// All routing and authentication logic is handled in client-side components and layouts.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [], // An empty matcher means the middleware will not run on any paths.
};
