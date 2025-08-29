import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 環境変数の存在確認（値は表示しない）
    const config = {
      projectId: {
        exists: !!process.env.FIREBASE_PROJECT_ID,
        value: process.env.FIREBASE_PROJECT_ID ? 'memorylink-cms' : 'NOT SET'
      },
      clientEmail: {
        exists: !!process.env.FIREBASE_CLIENT_EMAIL,
        value: process.env.FIREBASE_CLIENT_EMAIL ? 
          process.env.FIREBASE_CLIENT_EMAIL.substring(0, 20) + '...' : 'NOT SET'
      },
      privateKey: {
        exists: !!process.env.FIREBASE_PRIVATE_KEY,
        hasBeginMarker: process.env.FIREBASE_PRIVATE_KEY?.includes('-----BEGIN PRIVATE KEY-----') || false,
        hasEndMarker: process.env.FIREBASE_PRIVATE_KEY?.includes('-----END PRIVATE KEY-----') || false,
        length: process.env.FIREBASE_PRIVATE_KEY?.length || 0
      }
    };

    return NextResponse.json({
      success: true,
      message: 'Firebase設定チェック',
      config,
      allConfigured: config.projectId.exists && config.clientEmail.exists && config.privateKey.exists,
      recommendations: [
        !config.projectId.exists ? 'FIREBASE_PROJECT_ID を設定してください' : null,
        !config.clientEmail.exists ? 'FIREBASE_CLIENT_EMAIL を設定してください' : null,
        !config.privateKey.exists ? 'FIREBASE_PRIVATE_KEY を設定してください' : null,
        config.privateKey.exists && !config.privateKey.hasBeginMarker ? 'FIREBASE_PRIVATE_KEY の形式を確認してください（-----BEGIN PRIVATE KEY----- で始まる必要があります）' : null
      ].filter(Boolean)
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: '設定確認中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


