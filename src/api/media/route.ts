// src/app/api/media/route.ts
// This legacy route is no longer used, as uploads are handled via the client-side SDK
// and assets are created as a subcollection of a memory.
// It can be removed or kept for reference for other server-side API patterns.
import { NextRequest, NextResponse } from 'next/server';
import { getUidFromRequest } from '../_lib/auth';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';

function err(status: number, msg: string) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    if (!uid) {
      return err(401, 'UNAUTHENTICATED: Invalid or missing token.');
    }
    
    const body = await req.json();

    const required = ['name','type','url','storagePath','size', 'memoryId'];
    for (const k of required) {
      if (body?.[k] === undefined) return err(400, `Missing field: ${k}`);
    }
    if (!['image','video', 'audio'].includes(body.type)) {
      return err(400, 'Invalid type (must be image|video|audio)');
    }

    const db = getFirestore(getAdminApp());
    // Create asset in the subcollection of the specified memory
    const docRef = db.collection('memories').doc(body.memoryId).collection('assets').doc();
    const now = new Date();

    const newAsset = { 
      id: docRef.id, 
      ownerUid: uid, 
      memoryId: body.memoryId,
      name: body.name,
      type: body.type,
      url: body.url,
      storagePath: body.storagePath,
      size: body.size,
      createdAt: now, 
      updatedAt: now 
    };
    await docRef.set(newAsset);

    return NextResponse.json({ ok: true, data: newAsset }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || e);
    console.error("API Error in /api/media:", msg);
    if (msg.includes('UNAUTHENTICATED') || msg.includes('verifyIdToken')) {
      return err(401, 'verifyIdToken failed');
    }
    return err(500, msg);
  }
}
