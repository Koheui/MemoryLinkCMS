
// src/app/(app)/account/page.tsx
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AccountPage() {
  const { user, loading, handleLogout } = useAuth();
  const router = useRouter();

  // This is a fallback. Ideally, users are redirected to their memory page directly.
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);


  if (loading || !user) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">アカウント情報</h1>
        <p className="text-muted-foreground">アカウント設定の確認と管理を行います。</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>プロフィール</CardTitle>
          <CardDescription>現在ログインしているユーザーの情報です。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" value={user.email || ''} readOnly disabled />
          </div>
           <div className="space-y-2">
            <Label htmlFor="uid">ユーザーID</Label>
            <Input id="uid" value={user.uid} readOnly disabled />
          </div>
        </CardContent>
      </Card>
      <Card>
         <CardHeader>
            <CardTitle>セッション管理</CardTitle>
        </CardHeader>
        <CardContent>
            <Button variant="destructive" onClick={handleLogout}>
                ログアウト
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
