// src/app/api/gate/lp-form/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { ClaimRequest } from '@/lib/types';
import { sendEmailLink, hashEmail } from '@/lib/email-link-utils';

// Firebase Admin初期化
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const auth = getAuth();

// reCAPTCHA検証
async function verifyRecaptcha(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${process.env.RECAPTCHA_SECRET}&response=${token}`,
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('reCAPTCHA検証エラー:', error);
    return false;
  }
}

// レート制限チェック
async function checkRateLimit(email: string): Promise<boolean> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const query = await db
      .collection('claimRequests')
      .where('email', '==', email)
      .where('createdAt', '>', oneHourAgo)
      .where('status', 'in', ['pending', 'sent'])
      .get();

    return query.empty; // 1時間以内にリクエストがない場合はtrue
  } catch (error) {
    console.error('レート制限チェックエラー:', error);
    return false;
  }
}

// 監査ログ記録
async function logAuditEvent(event: string, metadata: any) {
  try {
    const logId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const yyyyMMdd = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    await db.collection('auditLogs').doc(yyyyMMdd).collection('logs').doc(logId).set({
      logId,
      event,
      actor: 'system',
      tenant: metadata.tenant || 'default',
      lpId: metadata.lpId || 'default',
      requestId: metadata.requestId,
      emailHash: metadata.email ? hashEmail(metadata.email) : undefined,
      metadata,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('監査ログ記録エラー:', error);
  }
}

// JWT生成は不要（Firebase Email Link使用）

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, tenant, lpId, productType, recaptchaToken } = body;

    // 入力検証
    if (!email || !tenant || !lpId || !productType || !recaptchaToken) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    // reCAPTCHA検証
    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isRecaptchaValid) {
      return NextResponse.json(
        { error: 'reCAPTCHA検証に失敗しました' },
        { status: 400 }
      );
    }

    // レート制限チェック
    const isRateLimitOk = await checkRateLimit(email);
    if (!isRateLimitOk) {
      return NextResponse.json(
        { error: 'レート制限に達しました。1時間後に再試行してください。' },
        { status: 429 }
      );
    }

    // claimRequest作成
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const claimRequest: ClaimRequest = {
      requestId,
      email,
      tenant,
      lpId,
      productType,
      status: 'pending',
      source: 'lp-form',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('claimRequests').doc(requestId).set(claimRequest);

    // 監査ログ記録
    await logAuditEvent('gate.accepted', {
      requestId,
      email,
      tenant,
      lpId,
      productType,
      source: 'lp-form',
    });

    // Firebase Email Link送信
    await sendEmailLink({
      email,
      requestId,
      tenant,
      lpId,
    });

    // claimRequestをsent状態に更新
    await db.collection('claimRequests').doc(requestId).update({
      status: 'sent',
      sentAt: new Date(),
      updatedAt: new Date(),
    });

    // 監査ログ記録（送信完了）
    await logAuditEvent('claim.sent', {
      requestId,
      email,
      tenant,
      lpId,
    });

    return NextResponse.json({
      success: true,
      message: 'アクセスリンクをメールで送信しました',
      requestId,
    });

  } catch (error) {
    console.error('LPフォーム処理エラー:', error);
    return NextResponse.json(
      { error: '内部サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
