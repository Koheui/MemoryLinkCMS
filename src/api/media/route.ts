// src/app/api/media/route.ts
// This route is not currently used by the new MediaUploader component,
// as it writes directly to Firestore from the client.
// This is acceptable for this stage of the project as Firestore rules
// can secure the 'assets' collection.
// We are leaving the file here for potential future use (e.g. server-side validation).
import { NextRequest, NextResponse } from 'next/server';
import { getUidFromRequest } from '../_lib/auth';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';

function err(status: number, msg: string) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req); // ★ verifyIdToken → uid
    if (!uid) {
      return err(401, 'UNAUTHENTICATED: Invalid or missing token.');
    }
    
    const body = await req.json();

    // Note: The new Asset type requires `storagePath`
    const required = ['name','type','url','storagePath','size'];
    for (const k of required) {
      if (body?.[k] === undefined) return err(400, `Missing field: ${k}`);
    }
    if (!['image','video', 'audio', 'album'].includes(body.type)) {
      return err(400, `Invalid type (must be image|video|audio|album)`);
    }

    const db = getFirestore(getAdminApp());
    // The collection should be 'assets' according to the new media library logic
    const docRef = db.collection('assets').doc();
    const now = new Date();

    const newAsset = { 
      id: docRef.id, 
      ownerUid: uid, 
      ...body, 
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
