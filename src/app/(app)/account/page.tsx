
// src/app/(app)/account/page.tsx
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Copy, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';

export default function AccountPage() {
  const { user, loading, handleLogout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const [isFetchingMemoryId, setIsFetchingMemoryId] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    const fetchMemoryId = async () => {
        if (user) {
            setIsFetchingMemoryId(true);
            try {
                const memoriesQuery = query(
                    collection(db, 'memories'), 
                    where('ownerUid', '==', user.uid), 
                    limit(1)
                );
                const querySnapshot = await getDocs(memoriesQuery);
                if (!querySnapshot.empty) {
                    const fetchedMemoryId = querySnapshot.docs[0].id;
                    setMemoryId(fetchedMemoryId);
                } else {
                    console.warn("No memory found for user:", user.uid);
                }
            } catch (error) {
                console.error("Error fetching memoryId for account page:", error);
            } finally {
                setIsFetchingMemoryId(false);
            }
        } else {
            setIsFetchingMemoryId(false);
        }
    };
    if (!loading && user) {
      fetchMemoryId();
    }
  }, [user, loading]);


  if (loading || isFetchingMemoryId || !user) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const publicUrl = memoryId ? `https://mem.example.com/p/${memoryId}` : '';

  const handleCopy = async () => {
    if (publicUrl) {
      try {
        await navigator.clipboard.writeText(publicUrl);
        setIsCopied(true);
        toast({ title: '成功', description: '公開URLをクリップボードにコピーしました。' });
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        toast({ variant: 'destructive', title: '失敗', description: 'URLのコピーに失敗しました。' });
      }
    }
  };

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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>公開ページ</CardTitle>
          <CardDescription>このURLをNFCタグに書き込むと、スマートフォンで読み取れるようになります。</CardDescription>
        </CardHeader>
        <CardContent>
          {publicUrl ? (
            <div className="flex items-center space-x-2">
              <Input id="publicUrl" value={publicUrl} readOnly />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">公開ページがまだ作成されていません。</p>
          )}
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
