import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { sendEmailLink, hashEmail } from '@/lib/email-link-utils';
import { ClaimRequest } from '@/lib/types';
import Stripe from 'stripe';

const db = getAdminFirestore();

// Stripe署名検証
function verifyStripeSignature(payload: string, signature: string): boolean {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    return !!event;
  } catch (error) {
    console.error('Stripe署名検証エラー:', error);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Stripe署名が不足しています' },
        { status: 400 }
      );
    }

    // Stripe署名検証
    if (!verifyStripeSignature(body, signature)) {
      return NextResponse.json(
        { error: '無効なStripe署名です' },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);

    // 決済成功イベントの処理
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // メタデータから必要な情報を取得
      const metadata = session.metadata;
      if (!metadata?.email || !metadata?.tenant || !metadata?.lpId || !metadata?.productType) {
        console.error('必要なメタデータが不足:', metadata);
        return NextResponse.json(
          { error: '必要なメタデータが不足しています' },
          { status: 400 }
        );
      }

      const { email, tenant, lpId, productType } = metadata;

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
        stripeSessionId: session.id,
        amount: session.amount_total,
        currency: session.currency,
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
        stripeSessionId: session.id,
        amount: session.amount_total,
        currency: session.currency,
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
        stripeSessionId: session.id,
      });

      console.log('Stripe決済成功 - クレーム要求作成完了:', {
        requestId,
        email,
        tenant,
        lpId,
        productType,
      });
    }

    // その他のイベントも処理可能（必要に応じて）
    // if (event.type === 'payment_intent.succeeded') { ... }
    // if (event.type === 'invoice.payment_succeeded') { ... }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Stripe Webhook処理エラー:', error);
    return NextResponse.json(
      { error: '内部サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
