import { getAdminAuth } from '@/lib/firebase/admin';

interface ActionCodeSettings {
  url: string;
  handleCodeInApp: boolean;
  iOS?: {
    bundleId: string;
  };
  android?: {
    packageName: string;
    installApp?: boolean;
    minimumVersion?: string;
  };
  dynamicLinkDomain?: string;
}

interface SendEmailLinkParams {
  email: string;
  requestId: string;
  tenant: string;
  lpId: string;
  baseUrl?: string;
}

/**
 * Firebase Auth Email Linkを送信する
 */
export async function sendEmailLink({
  email,
  requestId,
  tenant,
  lpId,
  baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}: SendEmailLinkParams): Promise<void> {
  try {
    console.log('🔧 Firebase Admin Auth初期化中...');
    const auth = getAdminAuth();

    // クレームURLを構築
    const claimUrl = new URL('/claim', baseUrl);
    claimUrl.searchParams.set('rid', requestId);
    claimUrl.searchParams.set('tenant', tenant);
    claimUrl.searchParams.set('lpId', lpId);

    // Action Code設定
    const actionCodeSettings: ActionCodeSettings = {
      url: claimUrl.toString(),
      handleCodeInApp: true,
      // iOS/Android設定は後で追加可能
      // iOS: {
      //   bundleId: 'com.example.memorylink'
      // },
      // android: {
      //   packageName: 'com.example.memorylink',
      //   installApp: true,
      //   minimumVersion: '1.0.0'
      // }
    };

    // Firebase Auth Email Link送信
    await auth.generateSignInWithEmailLink(email, actionCodeSettings);

    console.log('Firebase Email Link送信成功:', {
      email,
      requestId,
      claimUrl: claimUrl.toString(),
    });

  } catch (error) {
    console.error('Firebase Email Link送信エラー:', error);
    throw new Error(`メールリンク送信に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * メールアドレスを正規化する
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * メールアドレスのハッシュを生成する（監査ログ用）
 */
export function hashEmail(email: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(normalizeEmail(email)).digest('hex').substring(0, 16);
}

