
// src/app/(app)/account/page.tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy } from 'lucide-react';


export default function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // This effect redirects the user to their memory page once the user object is available.
    // The main redirect logic is in the AppLayout.
    if (!authLoading && user) {
      router.replace(`/memories/${user.uid}`);
    }
  }, [user, authLoading, router]);


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
  
  // This content will be briefly visible if the redirect takes a moment.
  // Or it can serve as a fallback if the redirect in the layout fails.
  const publicUrl = `${window.location.origin.replace('app.', 'mem.')}/p/${user.uid}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    toast({ title: '成功', description: '公開ページのURLをコピーしました。'});
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div>
            <h1 className="text-2xl font-bold tracking-tight font-headline">アカウント情報</h1>
            <p className="text-muted-foreground">あなたの登録情報と公開ページURLです。</p>
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
                <CardTitle>公開ページURL</CardTitle>
                <CardDescription>このURLをNFCタグに書き込んだり、共有したりできます。</CardDescription>
            </CardHeader>
            <CardContent>
                {publicUrl ? (
                    <div className="flex w-full max-w-md items-center space-x-2">
                        <Input value={publicUrl} readOnly />
                        <Button type="button" size="icon" onClick={handleCopy}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                ): (
                    <p className="text-muted-foreground">公開ページのURLを生成できませんでした。</p>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
