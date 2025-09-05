import { NextRequest, NextResponse } from 'next/server';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getTenantFromOrigin } from '@/lib/security/tenant-validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, tenant, lpId, productType, recaptchaToken } = body;

    // バリデーション
    if (!email || !tenant || !lpId || !productType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Originベースのテナント検証
    const origin = request.headers.get('origin') || request.headers.get('referer') || '';
    let actualTenant: string;
    let actualLpId: string;

    try {
      const tenantInfo = getTenantFromOrigin(origin);
      actualTenant = tenantInfo.tenant;
      actualLpId = tenantInfo.lpId;
    } catch (error) {
      // 開発環境ではクライアントの値を許可
      if (process.env.NODE_ENV === 'development') {
        actualTenant = tenant;
        actualLpId = lpId;
      } else {
        return NextResponse.json(
          { error: 'Invalid origin' },
          { status: 403 }
        );
      }
    }

    // reCAPTCHA検証（開発環境ではスキップ）
    if (process.env.NODE_ENV !== 'development') {
      if (!recaptchaToken || recaptchaToken === 'dev-token') {
        return NextResponse.json(
          { error: 'Invalid reCAPTCHA token' },
          { status: 400 }
        );
      }
      // TODO: 実際のreCAPTCHA検証を実装
    }

    // claimRequestsに保存
    const claimRequest = {
      email,
      tenant: actualTenant,
      lpId: actualLpId,
      productType,
      origin,
      ip: request.headers.get('x-forwarded-for') || request.ip || 'unknown',
      ua: request.headers.get('user-agent') || 'unknown',
      recaptchaScore: recaptchaToken === 'dev-token' ? 1.0 : 0.5,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'claimRequests'), claimRequest);
    const requestId = docRef.id;

    // JWTトークンを生成（簡易版）
    const jwt = Buffer.from(JSON.stringify({
      sub: requestId,
      email,
      tenant: actualTenant,
      lpId: actualLpId,
      exp: Math.floor(Date.now() / 1000) + (72 * 60 * 60), // 72時間
    })).toString('base64');

    // メールリンクを送信
    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_CLAIM_CONTINUE_URL || 'http://localhost:3000/claim'}?k=${jwt}`,
      handleCodeInApp: true,
    };

    await sendSignInLinkToEmail(auth, email, actionCodeSettings);

    // ステータスを更新
    await addDoc(collection(db, 'auditLogs'), {
      action: 'lpForm.sent',
      target: requestId,
      payload: { email, tenant: actualTenant, lpId: actualLpId },
      ts: serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      message: 'Mail sent',
      requestId,
    });

  } catch (error) {
    console.error('LP form error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
