// src/app/api/orders/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUidFromRequest } from '../../_lib/auth';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { Order } from '@/lib/types';

function err(status: number, msg: string) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const adminUid = await getUidFromRequest(req);
    // TODO: Add a proper admin check here by looking at custom claims
    if (!adminUid) {
      return err(403, 'Forbidden: Administrator access required.');
    }
    
    const body = await req.json();
    const { email, productType } = body;

    if (!email || !productType) {
        return err(400, 'Missing required fields: email and productType.');
    }

    const db = getFirestore(getAdminApp());
    const newOrderRef = db.collection('orders').doc();
    
    const newOrderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
      userUid: null, // Not assigned to a user yet
      memoryId: null, // Not created yet
      email: email,
      productType: productType,
      status: 'draft',
    };

    await newOrderRef.set({
      ...newOrderData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: adminUid, // Track which admin created it
    });

    const finalOrder = {
        id: newOrderRef.id,
        ...newOrderData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }

    return NextResponse.json({ ok: true, data: finalOrder }, { status: 200 });

  } catch (e: any) {
    const msg = String(e?.message || e);
    console.error("API Error in /api/orders/create:", e);
    if (msg.includes('UNAUTHENTICATED') || msg.includes('verifyIdToken')) {
      return err(401, 'Authentication failed');
    }
    return err(500, 'Internal Server Error: ' + msg);
  }
}
