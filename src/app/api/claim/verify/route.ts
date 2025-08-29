import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import jwt from 'jsonwebtoken';
import { ClaimRequest, Memory } from '@/lib/types';

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

// JWT検証
function verifyClaimToken(token: string): { valid: boolean; payload?: any } {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // クレームJWTの検証
    if (payload.type !== 'claim' || !payload.sub) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch (error) {
    console.error('クレームJWT検証エラー:', error);
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
      actor: metadata.uid || 'system',
      tenant: metadata.tenant || 'default',
      lpId: metadata.lpId || 'default',
      requestId: metadata.requestId,
      memoryId: metadata.memoryId,
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
    const body = await request.json();
    const { token, idToken } = body;

    // 入力検証
    if (!token || !idToken) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    // Firebase ID Token検証
    const decodedIdToken = await auth.verifyIdToken(idToken);
    const userEmail = decodedIdToken.email;
    const userUid = decodedIdToken.uid;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'ユーザーのメールアドレスが取得できません' },
        { status: 400 }
      );
    }

    // クレームJWT検証
    const { valid, payload } = verifyClaimToken(token);
    if (!valid || !payload) {
      return NextResponse.json(
        { error: '無効なクレームトークンです' },
        { status: 401 }
      );
    }

    const requestId = payload.sub;

    // claimRequestの状態をチェック
    const claimRequestDoc = await db.collection('claimRequests').doc(requestId).get();

    if (!claimRequestDoc.exists) {
      return NextResponse.json(
        { error: 'クレーム要求が見つかりません' },
        { status: 404 }
      );
    }

    const claimRequestData = claimRequestDoc.data() as ClaimRequest;

    // メールアドレスの一致確認
    if (claimRequestData.email !== userEmail) {
      return NextResponse.json(
        { 
          error: 'メールアドレスが一致しません',
          errorType: 'email_mismatch',
          message: 'クレームリンクは別のメールアドレス宛に送信されています。メールアドレスを変更するか、正しいアカウントでログインしてください。',
          requestId,
          claimEmail: claimRequestData.email,
          userEmail
        },
        { status: 403 }
      );
    }

    // 状態チェック
    if (claimRequestData.status === 'claimed') {
      return NextResponse.json(
        { error: 'このクレームは既に使用されています' },
        { status: 409 }
      );
    }

    if (claimRequestData.status === 'expired') {
      return NextResponse.json(
        { error: 'このクレームは期限切れです' },
        { status: 410 }
      );
    }

    if (claimRequestData.status !== 'sent') {
      return NextResponse.json(
        { error: 'このクレームは利用できません' },
        { status: 400 }
      );
    }

    // memory新規作成
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const memoryData: Memory = {
      memoryId,
      ownerUid: userUid,
      title: `新しい${claimRequestData.productType}メモリー`,
      type: 'other',
      status: 'draft',
      tenant: claimRequestData.tenant,
      lpId: claimRequestData.lpId,
      design: {
        theme: 'default',
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          accent: '#f59e0b',
        },
        fontFamily: 'sans-serif',
      },
      blocks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('memories').doc(memoryId).set(memoryData);

    // claimRequestsの状態を更新
    await db.collection('claimRequests').doc(requestId).update({
      status: 'claimed',
      claimedAt: new Date(),
      claimedByUid: userUid,
      memoryId,
      updatedAt: new Date(),
    });

    // 監査ログ記録
    await logAuditEvent('claim.used', {
      requestId,
      memoryId,
      email: claimRequestData.email,
      tenant: claimRequestData.tenant,
      lpId: claimRequestData.lpId,
      uid: userUid,
    });

    return NextResponse.json({
      success: true,
      message: 'クレームが正常に処理されました',
      memoryId,
      redirectUrl: `/memories/${memoryId}/edit`,
    });

  } catch (error) {
    console.error('クレーム検証エラー:', error);

    // JWT期限切れエラーの場合
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      return NextResponse.json(
        { error: 'クレームリンクの有効期限が切れています' },
        { status: 410 }
      );
    }

    return NextResponse.json(
      { error: '内部サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
