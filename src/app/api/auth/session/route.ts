// src/app/api/auth/session/route.ts
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Firebase Admin SDK
getAdminApp();

export async function POST(req: NextRequest) {
    try {
        const { idToken } = await req.json();
        if (!idToken) {
            return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
        }

        // Set session expiration to 14 days.
        const expiresIn = 60 * 60 * 24 * 14 * 1000;
        const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });

        const options = {
            name: '__session',
            value: sessionCookie,
            maxAge: expiresIn / 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        };

        cookies().set(options);

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Session login error:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 401 });
    }
}


export async function DELETE(req: NextRequest) {
    try {
        const sessionCookie = cookies().get('__session')?.value;
        if (sessionCookie) {
            const decodedClaims = await getAuth().verifySessionCookie(sessionCookie).catch(() => null);
            if (decodedClaims) {
                await getAuth().revokeRefreshTokens(decodedClaims.sub);
            }
        }

        // Clear the cookie
        cookies().delete('__session');

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Session logout error:', error);
        return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 });
    }
}
