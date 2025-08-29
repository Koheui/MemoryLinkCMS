import { NextRequest, NextResponse } from 'next/server';
import { sendEmailLink } from '@/lib/email-link-utils';
import { testFirebaseAdmin } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    // Firebase Admin接続テスト
    console.log('🧪 Firebase Admin接続テスト中...');
    await testFirebaseAdmin();
    
    const body = await request.json();
    const { email, tenant = 'test', lpId = 'test-lp' } = body;

    // 入力検証
    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }

    console.log('📧 メールリンク送信テスト開始:');
    console.log('- 送信先:', email);
    console.log('- Tenant:', tenant);
    console.log('- LP ID:', lpId);

    // テスト用のrequestId
    const requestId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Firebase Email Link送信
    await sendEmailLink({
      email,
      requestId,
      tenant,
      lpId,
    });

    console.log('✅ メールリンク送信成功');

    return NextResponse.json({
      success: true,
      message: 'テスト用メールリンクを送信しました',
      requestId,
      email,
      note: 'このテストではFirestoreは使用していません'
    });

  } catch (error) {
    console.error('❌ メールリンク送信エラー:', error);
    return NextResponse.json(
      { 
        error: 'メールリンク送信に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

