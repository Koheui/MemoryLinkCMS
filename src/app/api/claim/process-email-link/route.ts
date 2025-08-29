import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { getAdminAuth } from '@/lib/firebase/admin';
import { ClaimRequest, Memory } from '@/lib/types';

const db = getAdminFirestore();
const auth = getAdminAuth();

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
    const { email, idToken } = body;

    // 入力検証
    if (!email || !idToken) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    // Firebase ID Token検証
    const decodedIdToken = await auth.verifyIdToken(idToken);
    const userEmail = decodedIdToken.email;
    const userUid = decodedIdToken.uid;

    if (!userEmail || userEmail !== email) {
      return NextResponse.json(
        { error: 'メールアドレスが一致しません' },
        { status: 403 }
      );
    }

    // 該当するクレーム要求を検索
    const claimRequestsQuery = await db
      .collection('claimRequests')
      .where('email', '==', email)
      .where('status', '==', 'sent')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (claimRequestsQuery.empty) {
      return NextResponse.json(
        { error: '有効なクレーム要求が見つかりません' },
        { status: 404 }
      );
    }

    const claimRequestDoc = claimRequestsQuery.docs[0];
    const claimRequestData = claimRequestDoc.data() as ClaimRequest;
    const requestId = claimRequestDoc.id;

    // 期限チェック（72時間）
    const sentAt = claimRequestData.sentAt?.toDate() || claimRequestData.createdAt?.toDate();
    if (sentAt && Date.now() - sentAt.getTime() > 72 * 60 * 60 * 1000) {
      // 期限切れとしてマーク
      await claimRequestDoc.ref.update({
        status: 'expired',
        updatedAt: new Date(),
      });

      await logAuditEvent('claim.expired', {
        requestId,
        email: claimRequestData.email,
        tenant: claimRequestData.tenant,
        lpId: claimRequestData.lpId,
      });

      return NextResponse.json(
        { error: 'クレームリンクの有効期限が切れています' },
        { status: 410 }
      );
    }

    // memory新規作成
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const memoryData: Memory = {
      memoryId,
      ownerUid: userUid,
      title: `新しい${claimRequestData.productType || 'メモリー'}`,
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
    await claimRequestDoc.ref.update({
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
    console.error('Email Linkクレーム処理エラー:', error);

    if (error instanceof Error && error.message.includes('auth/id-token-expired')) {
      return NextResponse.json(
        { error: '認証トークンの有効期限が切れています。再ログインしてください。' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '内部サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
