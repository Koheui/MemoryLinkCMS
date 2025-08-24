// src/app/signup/page.tsx
'use client';
import { AuthForm } from '@/components/auth-form';
import { Suspense } from 'react';

// Wrap the form in a Suspense boundary to allow `useSearchParams` to function correctly.
function SignUpPageContent() {
  return <AuthForm type="signup" />;
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpPageContent />
    </Suspense>
  )
}
