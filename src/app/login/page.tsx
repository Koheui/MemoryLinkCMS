// src/app/login/page.tsx
'use client';
import { AuthForm } from '@/components/auth-form';
import { Suspense } from 'react';

function LoginPageContent() {
  return <AuthForm type="login" />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
