// src/app/signup/page.tsx
'use client';
import { AuthForm } from '@/components/auth-form';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Wrap the form in a Suspense boundary to allow `useSearchParams` to function correctly.
function SignUpPageContent() {
  return <AuthForm type="signup" />;
}

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="text-indigo-600">サインアップページを読み込み中...</span>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              想い出を
              <span className="text-indigo-600">永遠に</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
              大切な思い出を美しいデジタルページに。NFCタグやQRコードで簡単アクセス。
              写真、動画、音声、テキストを組み合わせて、心に残る想い出ページを作成しましょう。
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>買い切りモデル</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>無制限ストレージ</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>オフライン対応</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-indigo-100">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">美しいデザイン</h3>
              <p className="mt-2 text-sm text-gray-500">プロがデザインしたテンプレートで、誰でも美しい想い出ページを作成できます。</p>
            </div>
            <div className="text-center">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-indigo-100">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">簡単アクセス</h3>
              <p className="mt-2 text-sm text-gray-500">NFCタグやQRコードで、スマートフォンから簡単にアクセスできます。</p>
            </div>
            <div className="text-center">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-indigo-100">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">クラウド保存</h3>
              <p className="mt-2 text-sm text-gray-500">大切な思い出を安全にクラウドに保存。いつでもどこからでもアクセス可能です。</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Up Form Section */}
      <div className="py-16">
        <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">アカウントを作成</h2>
            <p className="mt-2 text-sm text-gray-600">
              秘密鍵（claim key）をお持ちの方は、初回ログイン時にご入力ください
            </p>
          </div>
          <Suspense fallback={<LoadingFallback />}>
            <SignUpPageContent />
          </Suspense>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-sm text-gray-500">
              © 2024 MemoryLink CMS. All rights reserved.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              想い出を永遠に残す、次世代のデジタルメモリアルサービス
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
