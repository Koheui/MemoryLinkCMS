// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  // middlewareはリクエストの書き換えのみを行うため、軽量なedge runtimeで十分
  runtime: 'edge',
  matcher: [
    '/pages', // ログイン後のリダイレクト先
  ],
};

export function middleware(request: NextRequest) {
  // 認証チェックは行わない。/pages へのアクセスを /memories に書き換えるだけ。
  // 実際の認証チェックとリダイレクトは /app/(app)/memories/page.tsx で行われる。
  if (request.nextUrl.pathname === '/pages') {
    return NextResponse.rewrite(new URL('/memories', request.url));
  }

  return NextResponse.next();
}
