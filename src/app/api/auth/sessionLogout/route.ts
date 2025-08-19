// src/app/api/auth/sessionLogout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';

export async function POST(req: NextRequest) {
  const sessionCookie = cookies().get('__session')?.value;

  if (sessionCookie) {
    try {
        getAdminApp();
        const decodedClaims = await getAuth().verifySessionCookie(sessionCookie);
        await getAuth().revokeRefreshTokens(decodedClaims.sub);
    } catch (error) {
        console.error('Error revoking refresh tokens:', error);
    }
  }

  // Always clear the cookie
  cookies().set('__session', '', { maxAge: -1, path: '/' });
  
  return NextResponse.json({ status: 'success' });
}
