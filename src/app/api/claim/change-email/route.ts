import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { sendEmailLink, hashEmail } from '@/lib/email-link-utils';
import { ClaimRequest } from '@/lib/types';

const db = getAdminFirestore();

// reCAPTCHA検証
async function verifyRecaptcha(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${process.env.RECAPTCHA_SECRET}&response=${token}`,
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('reCAPTCHA検証エラー:', error);
    return false;
  }
}

// レート制限チェック（24時間1回）
async function checkRateLimit(requestId: string): Promise<boolean> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const query = await db
      .collection('claimRequests')
      .doc(requestId)
      .collection('emailHistory')
      .where('changedAt', '>', oneDayAgo)
      .get();

    return query.empty; // 24時間以内に変更履歴がない場合はtrue
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
    const { requestId, newEmail, recaptchaToken } = body;

    // 入力検証
    if (!requestId || !newEmail || !recaptchaToken) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    // reCAPTCHA検証
    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isRecaptchaValid) {
      return NextResponse.json(
        { error: 'reCAPTCHA検証に失敗しました' },
        { status: 400 }
      );
    }

    // claimRequestの取得
    const claimRequestDoc = await db.collection('claimRequests').doc(requestId).get();

    if (!claimRequestDoc.exists) {
      return NextResponse.json(
        { error: 'クレーム要求が見つかりません' },
        { status: 404 }
      );
    }

    const claimRequestData = claimRequestDoc.data() as ClaimRequest;

    // 状態チェック
    if (claimRequestData.status === 'claimed') {
      return NextResponse.json(
        { error: '既にクレーム済みのため、メールアドレスを変更できません' },
        { status: 400 }
      );
    }

    if (claimRequestData.status === 'expired') {
      return NextResponse.json(
        { error: '期限切れのクレーム要求のため、メールアドレスを変更できません' },
        { status: 400 }
      );
    }

    // レート制限チェック
    const isRateLimitOk = await checkRateLimit(requestId);
    if (!isRateLimitOk) {
      return NextResponse.json(
        { error: 'レート制限に達しました。24時間後に再試行してください。' },
        { status: 429 }
      );
    }

    // メールアドレス履歴を記録
    const emailHistoryRef = claimRequestDoc.ref.collection('emailHistory').doc();
    await emailHistoryRef.set({
      oldEmail: claimRequestData.email,
      newEmail,
      changedAt: new Date(),
      reason: 'user_request',
    });

    // claimRequestのメールアドレスを更新
    await claimRequestDoc.ref.update({
      email: newEmail,
      status: 'pending', // 再送待ち状態に戻す
      updatedAt: new Date(),
    });

    // 監査ログ記録
    await logAuditEvent('claim.emailChanged', {
      requestId,
      oldEmail: claimRequestData.email,
      newEmail,
      tenant: claimRequestData.tenant,
      lpId: claimRequestData.lpId,
    });

    // 新しいメールアドレスでFirebase Email Link送信
    await sendEmailLink({
      email: newEmail,
      requestId,
      tenant: claimRequestData.tenant,
      lpId: claimRequestData.lpId,
    });

    // claimRequestをsent状態に更新
    await claimRequestDoc.ref.update({
      status: 'sent',
      sentAt: new Date(),
      updatedAt: new Date(),
    });

    // 監査ログ記録（再送完了）
    await logAuditEvent('claim.resent', {
      requestId,
      email: newEmail,
      tenant: claimRequestData.tenant,
      lpId: claimRequestData.lpId,
    });

    return NextResponse.json({
      success: true,
      message: 'メールアドレスが変更され、新しいアクセスリンクが送信されました',
      requestId,
    });

  } catch (error) {
    console.error('メールアドレス変更エラー:', error);
    return NextResponse.json(
      { error: '内部サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}


