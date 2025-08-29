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

// 監査ログ記録
async function logAuditEvent(event: string, metadata: any) {
  try {
    const logId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const yyyyMMdd = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    await db.collection('auditLogs').doc(yyyyMMdd).collection('logs').doc(logId).set({
      logId,
      event,
      actor: metadata.adminUid || 'system',
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
    
    // 管理者権限チェック
    if (!decodedToken.role || decodedToken.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: 'requestIdが必要です' },
        { status: 400 }
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

    // 再送可能な状態かチェック
    if (claimRequestData?.status === 'claimed') {
      return NextResponse.json(
        { error: '既にクレーム済みです' },
        { status: 400 }
      );
    }

    // 新しいJWT生成
    const claimToken = generateClaimToken(requestId);

    // TODO: SendGridでメール送信
    console.log('メール再送予定:', {
      to: claimRequestData?.email,
      subject: '想い出クラウド - アクセスリンク（再送）',
      claimToken,
      requestId,
    });

    // claimRequestを更新
    await db.collection('claimRequests').doc(requestId).update({
      status: 'sent',
      sentAt: new Date(),
      updatedAt: new Date(),
    });

    // 監査ログ記録
    await logAuditEvent('claim.resent', {
      requestId,
      email: claimRequestData?.email,
      tenant: claimRequestData?.tenant,
      lpId: claimRequestData?.lpId,
      adminUid: decodedToken.uid,
    });

    return NextResponse.json({
      success: true,
      message: 'クレームリンクを再送しました',
    });

  } catch (error) {
    console.error('クレーム再送エラー:', error);
    
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


