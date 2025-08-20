
// src/app/(app)/account/page.tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy } from 'lucide-react';


export default function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchMemoryId = async () => {
        if (user) {
            setLoading(true);
            try {
                const memoriesQuery = query(
                    collection(db, 'memories'), 
                    where('ownerUid', '==', user.uid), 
                    limit(1)
                );
                const querySnapshot = await getDocs(memoriesQuery);
                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    setMemoryId(doc.id);
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'エラー',
                        description: 'あなたのページ情報が見つかりませんでした。',
                    })
                }
            } catch (error) {
                console.error("Error fetching memoryId for account page:", error);
                toast({
                    variant: 'destructive',
                    title: 'データ取得エラー',
                    description: 'ページ情報の取得中にエラーが発生しました。',
                })
            } finally {
              setLoading(false);
            }
        }
    };
    
    fetchMemoryId();
  }, [user, authLoading, toast]);


  if (loading || authLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!user) {
     return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold">ログインしていません</h1>
        <p className="text-muted-foreground">アカウント情報を見るにはログインしてください。</p>
      </div>
    )
  }
  
  const publicUrl = memoryId ? `${window.location.origin.replace('app.', 'mem.')}/p/${memoryId}` : '';

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
