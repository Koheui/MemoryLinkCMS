// src/app/(app)/account/page.tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy } from 'lucide-react';

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  if (authLoading || !user) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">読み込み中...</span>
        </div>
      </div>
    );
  }

  // This is a sample URL. In a multi-page setup, this URL might not be relevant
  // or would need to be selected from a list of pages.
  const samplePublicUrl = `${window.location.origin.replace('app.', 'mem.')}/p/SAMPLE_ID`;

  const handleCopy = () => {
    navigator.clipboard.writeText(samplePublicUrl);
    toast({ title: '成功', description: 'サンプルURLをコピーしました。' });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">アカウント情報</h1>
        <p className="text-muted-foreground">あなたの登録情報です。</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>登録メールアドレス</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{user.email}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>アカウントID (UID)</CardTitle>
          <CardDescription>
            これはあなたのアカウントに固有のIDです。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex w-full max-w-md items-center space-x-2">
            <Input value={user.uid} readOnly />
            <Button
              type="button"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(user.uid);
                toast({ title: 'UIDをコピーしました。'});
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
