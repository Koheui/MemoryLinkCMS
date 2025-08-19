// src/app/api/_lib/auth.ts
import { NextRequest } from 'next/server';
import admin from 'firebase-admin';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';

export async function getUidFromRequest(req: NextRequest): Promise<string> {
  // 1) Authorization: Bearer <idToken>
  const auth = req.headers.get('authorization');
  let idToken: string | undefined;
  if (auth?.startsWith('Bearer ')) idToken = auth.slice(7).trim();
  
  if (!idToken) throw new Error('UNAUTHENTICATED: missing idToken');

  const app = getAdminApp();
  const decoded = await admin.auth(app).verifyIdToken(idToken);
  return decoded.uid; // ここで 401/403 を吐かせる
}
