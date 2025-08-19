// src/app/api/auth/verify/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const sessionCookie = cookies().get('__session')?.value;

  if (!sessionCookie) {
    return NextResponse.json({ isAuthenticated: false, isAdmin: false }, { status: 200 });
  }

  try {
    getAdminApp();
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie, true /** checkRevoked */);
    const isAdmin = decodedClaims.role === 'admin';
    return NextResponse.json({ isAuthenticated: true, isAdmin }, { status: 200 });
  } catch (error) {
    // Session cookie is invalid or expired.
    return NextResponse.json({ isAuthenticated: false, isAdmin: false }, { status: 200 });
  }
}
