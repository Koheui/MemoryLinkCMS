import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { ClaimRequest } from '@/lib/types';

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

// Stripe初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Stripe署名検証
async function verifyStripeSignature(request: NextRequest): Promise<{ valid: boolean; payload?: any }> {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return { valid: false };
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    return { valid: true, payload: event };
  } catch (error) {
    console.error('Stripe署名検証エラー:', error);
    return { valid: false };
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

    return query.empty;
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
      emailHash: metadata.email ? Buffer.from(metadata.email).toString('base64') : undefined,
      metadata,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('監査ログ記録エラー:', error);
  }
}

// JWT生成
function generateClaimToken(requestId: string): string {
  return jwt.sign(
    { 
      sub: requestId,
      type: 'claim',
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_SECRET!,
    { expiresIn: '72h' }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Stripe署名検証
    const { valid, payload } = await verifyStripeSignature(request);
    if (!valid || !payload) {
      return NextResponse.json(
        { error: '無効なStripe署名です' },
        { status: 400 }
      );
    }

    const event = payload as Stripe.Event;

    // 決済成功イベントのみ処理
    if (event.type !== 'checkout.session.completed') {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    // メタデータから必要な情報を取得
    const metadata = session.metadata;
    if (!metadata?.email || !metadata?.tenant || !metadata?.lpId || !metadata?.productType) {
      console.error('必要なメタデータが不足:', metadata);
      return NextResponse.json({ received: true });
    }

    const { email, tenant, lpId, productType } = metadata;

    // レート制限チェック
    const isRateLimitOk = await checkRateLimit(email);
    if (!isRateLimitOk) {
      console.warn('レート制限に達しました:', email);
      return NextResponse.json({ received: true });
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
      source: 'stripe',
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
      source: 'stripe',
      sessionId: session.id,
      amount: session.amount_total,
    });

    // JWT生成
    const claimToken = generateClaimToken(requestId);

    // TODO: SendGridでメール送信
    console.log('メール送信予定:', {
      to: email,
      subject: '想い出クラウド - アクセスリンク',
      claimToken,
      requestId,
      sessionId: session.id,
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
      sessionId: session.id,
    });

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Stripe webhook処理エラー:', error);
    return NextResponse.json(
      { error: '内部サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}


