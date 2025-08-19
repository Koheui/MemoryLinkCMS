// src/app/api/env-check/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  let isParseable = false;
  let parseError = null;
  try {
      if(raw) {
        JSON.parse(raw);
        isParseable = true;
      }
  } catch(e: any) {
      parseError = e.message;
  }

  return NextResponse.json({
    ok: true,
    hasFIREBASE_SERVICE_ACCOUNT_JSON: !!raw,
    isParseable,
    parseError,
    samplePrefix: raw ? raw.slice(0, 80) + "..." : null,
  });
}
