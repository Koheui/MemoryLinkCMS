// src/app/api/env-check/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  return NextResponse.json({
    ok: true,
    hasFIREBASE_SERVICE_ACCOUNT_JSON: !!raw,
    samplePrefix: raw ? raw.slice(0, 40) : null,
  });
}
