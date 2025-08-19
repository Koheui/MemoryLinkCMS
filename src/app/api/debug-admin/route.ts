// src/app/api/debug-admin/route.ts
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import admin from 'firebase-admin';

export async function GET() {
  try {
    const app = getAdminApp();
    const projectId = admin.app(app).options.projectId;
    return NextResponse.json({ ok: true, projectId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e), stack: e.stack }, { status: 500 });
  }
}
