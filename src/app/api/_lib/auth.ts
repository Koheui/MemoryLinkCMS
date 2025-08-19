// src/app/api/_lib/auth.ts
import { NextRequest } from 'next/server';
import admin from 'firebase-admin';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';

export async function getUidFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    console.error("getUidFromRequest: No Bearer token found in Authorization header.");
    return null;
  }
  
  const idToken = authHeader.split('Bearer ')[1];

  if (!idToken) {
    console.error("getUidFromRequest: ID token is empty after splitting.");
    return null;
  }

  try {
    const app = getAdminApp();
    const decodedToken = await admin.auth(app).verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    console.error('getUidFromRequest: Error verifying ID token:', error);
    return null;
  }
}
