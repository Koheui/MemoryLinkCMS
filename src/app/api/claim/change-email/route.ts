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

// reCAPTCHA検証（TODO: 実装）
async function verifyRecaptcha(token: string): Promise<boolean> {
  // 現在は常にtrueを返す（開発用）
  // 本番環境では実際のreCAPTCHA検証を実装
  return true;
}

// レート制限チェック
async function checkRateLimit(requestId: string): Promise<boolean> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const query = await db
      .collection('auditLogs')
      .doc(new Date().toISOString().split('T')[0].replace(/-/g, ''))
      .collection('logs')
      .where('event', '==', 'claim.emailChangeRequested')
      .where('requestId', '==', requestId)
      .where('timestamp', '>', oneHourAgo)
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
      actor: metadata.uid || 'system',
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

// メール確認用JWT生成
function generateEmailConfirmToken(requestId: string, newEmail: string): string {
  return jwt.sign(
    { 
      sub: requestId,
      email: newEmail,
      type: 'email_confirm',
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Authorization ヘッダーからトークンを取得
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Firebase ID Token検証
    const decodedToken = await auth.verifyIdToken(idToken);
    const userUid = decodedToken.uid;

    const body = await request.json();
    const { requestId, newEmail, recaptchaToken } = body;

    // 入力検証
    if (!requestId || !newEmail) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    // メールアドレス形式検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      );
    }

    // reCAPTCHA検証（TODO: 実装）
    // const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    // if (!isRecaptchaValid) {
    //   return NextResponse.json(
    //     { error: 'reCAPTCHA検証に失敗しました' },
    //     { status: 400 }
    //   );
    // }

    // レート制限チェック
    const isRateLimitOk = await checkRateLimit(requestId);
    if (!isRateLimitOk) {
      return NextResponse.json(
        { error: 'レート制限に達しました。1時間後に再試行してください。' },
        { status: 429 }
      );
    }

    // claimRequestを取得
    const claimRequestDoc = await db.collection('claimRequests').doc(requestId).get();

    if (!claimRequestDoc.exists) {
      return NextResponse.json(
        { error: 'クレーム要求が見つかりません' },
        { status: 404 }
      );
    }

    const claimRequestData = claimRequestDoc.data();

    // クレーム状態の確認
    if (claimRequestData?.status === 'claimed') {
      return NextResponse.json(
        { error: '既にクレーム済みです' },
        { status: 400 }
      );
    }

    // メール確認用JWT生成
    const confirmToken = generateEmailConfirmToken(requestId, newEmail);

    // TODO: SendGridで確認メール送信
    console.log('確認メール送信予定:', {
      to: newEmail,
      subject: '想い出クラウド - メールアドレス変更確認',
      confirmToken,
      requestId,
      confirmUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/claim/confirm-email?k=${confirmToken}`,
    });

    // 監査ログ記録
    await logAuditEvent('claim.emailChangeRequested', {
      requestId,
      oldEmail: claimRequestData?.email,
      newEmail,
      uid: userUid,
      tenant: claimRequestData?.tenant,
      lpId: claimRequestData?.lpId,
    });

    return NextResponse.json({
      success: true,
      message: '確認メールを送信しました',
      newEmail,
    });

  } catch (error) {
    console.error('メールアドレス変更エラー:', error);
    
    // Firebase Auth エラーの場合
    if (error instanceof Error && error.message.includes('auth')) {
      return NextResponse.json(
        { error: '認証エラー' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '内部サーバーエラー' },
      { status: 500 }
    );
  }
}


