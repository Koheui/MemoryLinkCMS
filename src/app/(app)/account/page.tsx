
// src/app/(app)/account/page.tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page now primarily serves as a loading/redirecting hub after login.
// The actual redirect logic is in the AppLayout.
export default function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);
  
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-lg text-muted-foreground">読み込み中...</span>
      </div>
    </div>
  );
}
