// src/app/api/auth/sessionLogin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idToken = body.idToken as string;

    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required.' }, { status: 400 });
    }

    // Initialize Firebase Admin SDK
    const app = getAdminApp();

    // Set session expiration to 14 days.
    const expiresIn = 60 * 60 * 24 * 14 * 1000;
    
    const sessionCookie = await getAuth(app).createSessionCookie(idToken, { expiresIn });

    cookies().set('__session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('Session login error:', error);
    return NextResponse.json(
        { 
            error: 'Failed to create session.', 
            details: error.message,
            code: error.code
        }, 
        { status: 500 }
    );
  }
}
