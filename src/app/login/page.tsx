// src/app/login/page.tsx
'use client';
import { AuthForm } from '@/components/auth-form';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

function LoginPageContent() {
  return <AuthForm type="login" />;
}

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-muted/40">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span>ログインページを読み込み中...</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
