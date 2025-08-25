// src/app/api/debug-admin/route.ts
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';

export async function GET() {
  try {
    // getAdminApp()は初期化済みのappインスタンスを返す
    const app = getAdminApp();
    
    // appインスタンスから直接projectIdを取得する
    const projectId = app.options.projectId;

    if (!projectId) {
        throw new Error("Project ID not found in initialized app.");
    }

    return NextResponse.json({ ok: true, projectId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
