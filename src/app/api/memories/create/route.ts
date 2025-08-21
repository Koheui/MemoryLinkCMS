// src/app/api/memories/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUidFromRequest } from '../../_lib/auth';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { Memory } from '@/lib/types';

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
    const memoryType: Memory['type'] = body.type || 'other';

    const db = getFirestore(getAdminApp());
    const newMemoryRef = db.collection('memories').doc();
    
    const newMemoryData: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'> = {
      ownerUid: uid,
      title: '新しい想い出ページ',
      type: memoryType,
      status: 'draft',
      publicPageId: newMemoryRef.id, // Using its own ID for the public page for simplicity
      coverAssetId: null,
      profileAssetId: null,
      description: '', // Ensure description has a default value
      design: { theme: 'light', fontScale: 1.0 }, // Ensure design has a default value
    };
    
    await newMemoryRef.set({
      ...newMemoryData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const newMemory: Memory = {
        id: newMemoryRef.id,
        ...newMemoryData,
        // Faking timestamps for the immediate response to the client
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }

    return NextResponse.json({ ok: true, data: newMemory }, { status: 200 });

  } catch (e: any) {
    const msg = String(e?.message || e);
    console.error("API Error in /api/memories/create:", e);
    if (msg.includes('UNAUTHENTICATED') || msg.includes('verifyIdToken')) {
      return err(401, 'verifyIdToken failed');
    }
    return err(500, 'Internal Server Error: ' + msg);
  }
}
