import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import jwt from 'jsonwebtoken';

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

// メール確認JWT検証
function verifyEmailConfirmToken(token: string): { valid: boolean; payload?: any } {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // メール確認JWTの検証
    if (payload.type !== 'email_confirm' || !payload.sub || !payload.email) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch (error) {
    console.error('メール確認JWT検証エラー:', error);
    return { valid: false };
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

// 新しいクレーム用JWT生成
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('k');

    if (!token) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head><title>エラー</title></head>
        <body>
          <h1>エラー</h1>
          <p>無効な確認リンクです。トークンが見つかりません。</p>
        </body>
        </html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // メール確認JWT検証
    const { valid, payload } = verifyEmailConfirmToken(token);
    if (!valid || !payload) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head><title>エラー</title></head>
        <body>
          <h1>エラー</h1>
          <p>無効または期限切れの確認リンクです。</p>
        </body>
        </html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const requestId = payload.sub;
    const newEmail = payload.email;

    // claimRequestを取得
    const claimRequestDoc = await db.collection('claimRequests').doc(requestId).get();

    if (!claimRequestDoc.exists) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head><title>エラー</title></head>
        <body>
          <h1>エラー</h1>
          <p>クレーム要求が見つかりません。</p>
        </body>
        </html>`,
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const claimRequestData = claimRequestDoc.data();

    // 状態チェック
    if (claimRequestData?.status === 'claimed') {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head><title>既にクレーム済み</title></head>
        <body>
          <h1>既にクレーム済み</h1>
          <p>このクレームは既に使用されています。</p>
        </body>
        </html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // claimRequestsのメールアドレスを更新
    await db.collection('claimRequests').doc(requestId).update({
      email: newEmail,
      updatedAt: new Date(),
    });

    // 監査ログ記録（メールアドレス変更）
    await logAuditEvent('claim.emailChanged', {
      requestId,
      oldEmail: claimRequestData?.email,
      newEmail,
      tenant: claimRequestData?.tenant,
      lpId: claimRequestData?.lpId,
    });

    // 新しいJWT生成
    const claimToken = generateClaimToken(requestId);

    // TODO: SendGridで新しいクレームリンクを送信
    console.log('新しいクレームリンク送信予定:', {
      to: newEmail,
      subject: '想い出クラウド - アクセスリンク（メールアドレス変更完了）',
      claimToken,
      requestId,
      claimUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/claim?k=${claimToken}`,
    });

    // claimRequestを送信済み状態に更新
    await db.collection('claimRequests').doc(requestId).update({
      status: 'sent',
      sentAt: new Date(),
      updatedAt: new Date(),
    });

    // 監査ログ記録（再送）
    await logAuditEvent('claim.resent', {
      requestId,
      email: newEmail,
      tenant: claimRequestData?.tenant,
      lpId: claimRequestData?.lpId,
      reason: 'email_changed',
    });

    // 成功画面を表示
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>メールアドレス変更完了</title>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 40px; background: #f9fafb; }
          .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          h1 { color: #059669; margin: 0 0 16px 0; }
          p { color: #374151; line-height: 1.6; margin: 0 0 16px 0; }
          .email { font-weight: 600; color: #1f2937; }
          .note { background: #ecfdf5; padding: 16px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✅ メールアドレス変更完了</h1>
          <p>メールアドレスの変更が正常に完了しました。</p>
          <p>新しいメールアドレス: <span class="email">${newEmail}</span></p>
          
          <div class="note">
            <p><strong>📧 新しいクレームリンクを送信しました</strong></p>
            <p>変更後のメールアドレス宛に、新しいクレームリンクを送信しました。メールをご確認ください。</p>
          </div>
          
          <p>このページは閉じていただいて構いません。</p>
        </div>
      </body>
      </html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );

  } catch (error) {
    console.error('メール確認エラー:', error);
    
    // JWT期限切れエラーの場合
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head><title>期限切れ</title></head>
        <body>
          <h1>期限切れ</h1>
          <p>確認リンクの有効期限が切れています。再度メールアドレス変更を申請してください。</p>
        </body>
        </html>`,
        { status: 410, headers: { 'Content-Type': 'text/html' } }
      );
    }

    return new Response(
      `<!DOCTYPE html>
      <html>
      <head><title>エラー</title></head>
      <body>
        <h1>エラー</h1>
        <p>内部サーバーエラーが発生しました。</p>
      </body>
      </html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}


