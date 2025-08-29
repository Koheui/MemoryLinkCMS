import { initializeApp, getApps, cert, getApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

/**
 * Firebase Admin SDKを安全に初期化する
 */
export function initializeFirebaseAdmin(): App {
  // 既に初期化済みの場合は既存のアプリを返す
  if (adminApp) {
    return adminApp;
  }

  // 他の場所で初期化されたアプリがあるかチェック
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    console.log('✅ 既存のFirebase Adminアプリを使用');
    return adminApp;
  }

  try {
    // 環境変数チェック
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    console.log('🔧 Firebase Admin 初期化中...');
    console.log('- Project ID:', projectId ? '✅ 設定済み' : '❌ 未設定');
    console.log('- Client Email:', clientEmail ? '✅ 設定済み' : '❌ 未設定');
    console.log('- Private Key:', privateKey ? '✅ 設定済み' : '❌ 未設定');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Firebase Admin認証情報が不足しています。FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEYが必要です。');
    }

    // Firebase Admin初期化
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });

    console.log('✅ Firebase Admin初期化成功');
    return adminApp;

  } catch (error) {
    console.error('❌ Firebase Admin初期化エラー:', error);
    throw new Error(`Firebase Admin初期化に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Firebase Admin Authを取得する
 */
export function getAdminAuth(): Auth {
  const app = initializeFirebaseAdmin();
  return getAuth(app);
}

/**
 * Firebase Admin Firestoreを取得する
 */
export function getAdminFirestore(): Firestore {
  const app = initializeFirebaseAdmin();
  return getFirestore(app);
}

/**
 * Firebase Admin SDKが正しく初期化されているかテストする
 */
export async function testFirebaseAdmin(): Promise<void> {
  try {
    const auth = getAdminAuth();
    
    // テスト用のカスタムトークン生成
    const testUid = `test_${Date.now()}`;
    const customToken = await auth.createCustomToken(testUid);
    
    console.log('✅ Firebase Admin認証テスト成功');
    console.log('- カスタムトークン生成:', customToken ? '成功' : '失敗');
    
  } catch (error) {
    console.error('❌ Firebase Admin認証テストエラー:', error);
    throw new Error(`Firebase Admin認証テストに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

