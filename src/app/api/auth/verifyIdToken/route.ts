// src/app/api/auth/verifyIdToken/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';

function err(status: number, msg: string, details?: any) {
    return NextResponse.json({ ok: false, error: msg, details }, { status });
}

export async function POST(req: NextRequest) {
    try {
        const app = getAdminApp();
        const authHeader = req.headers.get('authorization');
        const idToken = authHeader?.split('Bearer ')[1];

        if (!idToken) {
            return err(400, 'Missing Authorization header with Bearer token');
        }

        const decodedToken = await getAuth(app).verifyIdToken(idToken);

        return NextResponse.json({ ok: true, uid: decodedToken.uid });

    } catch (e: any) {
        return err(500, 'verifyIdToken failed', {
            message: e.message,
            code: e.code,
            stack: e.stack,
        });
    }
}
