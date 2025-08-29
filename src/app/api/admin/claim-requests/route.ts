import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

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

export async function GET(request: NextRequest) {
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

    // claimRequestsを取得（最新100件）
    const claimRequestsSnapshot = await db
      .collection('claimRequests')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const claimRequests = claimRequestsSnapshot.docs.map(doc => ({
      ...doc.data(),
      // Firestoreの日付を文字列に変換
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
      sentAt: doc.data().sentAt?.toDate?.()?.toISOString() || doc.data().sentAt,
      claimedAt: doc.data().claimedAt?.toDate?.()?.toISOString() || doc.data().claimedAt,
    }));

    return NextResponse.json({
      claimRequests,
      total: claimRequests.length,
    });

  } catch (error) {
    console.error('クレーム要求取得エラー:', error);
    
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


