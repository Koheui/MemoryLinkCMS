import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { ClaimRequest } from '@/lib/types';
import { sendEmailLink, hashEmail } from '@/lib/email-link-utils';

// Firebase Admin初期化
if (!getApps().length) {
  try {
    // 環境変数から認証情報を読み込み
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.error('Firebase Admin設定エラー: 必要な環境変数が不足しています');
      console.error('必要な変数:', { projectId: !!projectId, clientEmail: !!clientEmail, privateKey: !!privateKey });
      
      // 開発環境用のフォールバック設定
      initializeApp();
    } else {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
  } catch (error) {
    console.error('Firebase Admin初期化エラー:', error);
    // フォールバック: デフォルト設定で初期化
    initializeApp();
  }
}

const db = getFirestore();

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
    const body = await request.json();
    const { email, tenant = 'default', lpId = 'test', productType = 'memorial' } = body;

    // 入力検証
    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }

    // メールアドレス形式検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      );
    }

    // claimRequest作成
    const requestId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      source: 'test',
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
      message: 'テスト用クレームリンクを送信しました',
      requestId,
      email,
      tenant,
      lpId,
    });

  } catch (error) {
    console.error('テスト用クレーム作成エラー:', error);
    return NextResponse.json(
      { error: '内部サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
