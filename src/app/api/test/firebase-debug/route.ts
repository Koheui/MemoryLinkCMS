import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

export async function GET() {
  try {
    console.log('🔍 Firebase Admin SDK詳細診断開始...');
    
    // 環境変数の存在確認
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    console.log('📊 環境変数チェック:');
    console.log('- PROJECT_ID:', projectId ? `設定済み (${projectId})` : '❌ 未設定');
    console.log('- CLIENT_EMAIL:', clientEmail ? `設定済み (${clientEmail})` : '❌ 未設定');
    console.log('- PRIVATE_KEY:', privateKey ? `設定済み (長さ: ${privateKey.length}文字)` : '❌ 未設定');
    
    if (!projectId || !clientEmail || !privateKey) {
      return NextResponse.json({
        success: false,
        error: '必要な環境変数が不足しています',
        details: {
          projectId: !!projectId,
          clientEmail: !!clientEmail,
          privateKey: !!privateKey
        }
      }, { status: 400 });
    }
    
    // private keyの形式チェック
    console.log('🔑 秘密鍵の形式チェック...');
    let formattedPrivateKey = privateKey;
    
    // 改行文字の処理
    if (!privateKey.includes('\n')) {
      console.log('⚠️ 秘密鍵に改行がありません。\\nを改行に変換します...');
      formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    // PEM形式の確認
    const hasPemHeader = formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----');
    const hasPemFooter = formattedPrivateKey.includes('-----END PRIVATE KEY-----');
    
    console.log('- PEMヘッダー:', hasPemHeader ? '✅' : '❌');
    console.log('- PEMフッター:', hasPemFooter ? '✅' : '❌');
    
    if (!hasPemHeader || !hasPemFooter) {
      return NextResponse.json({
        success: false,
        error: '秘密鍵のPEM形式が正しくありません',
        details: {
          hasPemHeader,
          hasPemFooter,
          keyLength: privateKey.length,
          startsWithBegin: privateKey.startsWith('-----BEGIN'),
          endsWithEnd: privateKey.endsWith('-----')
        }
      }, { status: 400 });
    }
    
    // Firebase Admin SDKの初期化テスト
    console.log('🚀 Firebase Admin SDK初期化テスト...');
    
    // 既存のアプリがあれば削除
    if (admin.apps.length > 0) {
      console.log('🔄 既存のFirebaseアプリを削除中...');
      await Promise.all(admin.apps.map(app => app?.delete()));
    }
    
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
      projectId: projectId,
    }, `debug-${Date.now()}`);
    
    console.log('✅ Firebase Admin SDK初期化成功');
    
    // Firebase Auth実際のテスト
    console.log('🔐 Firebase Auth実際のテスト...');
    const auth = admin.auth(app);
    
    // テスト用のカスタムトークン生成を試す（実際のAPI呼び出し）
    try {
      const testUid = 'test-debug-' + Date.now();
      console.log(`🎫 テスト用カスタムトークン生成中... (UID: ${testUid})`);
      
      const customToken = await auth.createCustomToken(testUid);
      console.log('✅ カスタムトークン生成成功');
      
      // アプリを削除
      await app.delete();
      
      return NextResponse.json({
        success: true,
        message: 'Firebase Admin SDK認証テスト成功',
        details: {
          projectId,
          clientEmail,
          privateKeyFormat: 'valid',
          authTest: 'success',
          customTokenGenerated: true
        }
      });
      
    } catch (authError: any) {
      console.error('❌ Firebase Auth認証エラー:', authError);
      
      // アプリを削除
      await app.delete();
      
      return NextResponse.json({
        success: false,
        error: 'Firebase Auth認証に失敗しました',
        details: {
          errorCode: authError.code,
          errorMessage: authError.message,
          suggestion: authError.message.includes('invalid_grant') 
            ? 'サービスアカウントキーが無効または取り消されている可能性があります。Firebase Consoleで新しいキーを生成してください。'
            : 'Firebase設定を確認してください。'
        }
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('💥 診断中にエラーが発生:', error);
    
    return NextResponse.json({
      success: false,
      error: '診断中にエラーが発生しました',
      details: {
        errorMessage: error.message,
        errorStack: error.stack?.split('\n').slice(0, 5)
      }
    }, { status: 500 });
  }
}

