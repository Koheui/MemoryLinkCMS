// This file is no longer needed with the new middleware approach.
// However, deleting files is not supported, so it will remain.
// No code changes are necessary here.
// src/app/api/auth/verify/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic' // defaults to auto

export async function GET(request: NextRequest) {
  const sessionCookie = cookies().get('__session')?.value;

  if (!sessionCookie) {
    return NextResponse.json({ isAuthenticated: false }, { status: 200 });
  }

  try {
    getAdminApp();
    await getAuth().verifySessionCookie(sessionCookie, true /** checkRevoked */);
    return NextResponse.json({ isAuthenticated: true }, { status: 200 });
  } catch (error) {
    // Session cookie is invalid or expired.
    return NextResponse.json({ isAuthenticated: false }, { status: 200 });
  }
}
