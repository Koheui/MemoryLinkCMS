// src/app/api/orders/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUidFromRequest } from '../../_lib/auth';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { Order } from '@/lib/types';
import admin from 'firebase-admin';

function err(status: number, msg: string) {
  return NextResponse.json({ error: msg }, { status });
}

async function verifyAdmin(uid: string): Promise<boolean> {
  const app = getAdminApp();
  const user = await admin.auth(app).getUser(uid);
  return user.customClaims?.role === 'admin';
}

export async function POST(req: NextRequest) {
  try {
    const adminUid = await getUidFromRequest(req);
    if (!adminUid) {
      return err(401, 'Authentication failed');
    }

    const isAdmin = await verifyAdmin(adminUid);
    if (!isAdmin) {
      return err(403, 'Forbidden: Administrator access required.');
    }
    
    const body = await req.json();
    const { email, productType } = body;

    if (!email || !productType) {
        return err(400, 'Missing required fields: email and productType.');
    }

    const db = getFirestore(getAdminApp());
    const newOrderRef = db.collection('orders').doc();
    
    const newOrderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'userUid' | 'memoryId'> = {
      email: email,
      productType: productType,
      status: 'draft',
    };

    await newOrderRef.set({
      ...newOrderData,
      userUid: null,
      memoryId: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: adminUid, // Track which admin created it
    });

    const finalOrder = {
        id: newOrderRef.id,
        ...newOrderData,
        userUid: null,
        memoryId: null,
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
     if (msg.includes('Forbidden')) {
      return err(403, 'Forbidden: Administrator access required.');
    }
    return err(500, 'Internal Server Error: ' + msg);
  }
}
