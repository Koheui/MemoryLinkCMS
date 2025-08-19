
// src/app/(app)/pages/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Loader2, FilePlus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { Memory } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase/client';
import { collection, query, where, getDocs, orderBy, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';


export default function PagesListPage() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };

    async function fetchMemories() {
      setLoading(true);
      try {
        const memoriesCollectionRef = collection(db, 'memories');
        const q = query(memoriesCollectionRef, where('ownerUid', '==', user!.uid), orderBy('createdAt', 'desc'));
        const memoriesSnapshot = await getDocs(q);

        if (memoriesSnapshot.empty) {
          setMemories([]);
          setLoading(false);
          return;
        }

        const memoriesPromises = memoriesSnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          let coverImageUrl: string | null = `https://placehold.co/400x225.png`;

          if (data.coverAssetId) {
            const assetDocRef = doc(db, 'assets', data.coverAssetId);
            const assetDoc = await getDoc(assetDocRef);
            if (assetDoc.exists()) {
              const assetData = assetDoc.data();
              if (assetData?.url) {
                coverImageUrl = assetData.url;
              }
            }
          }
          
          return {
            id: docSnapshot.id,
            ...data,
            createdAt: data.createdAt.toDate().toISOString(),
            updatedAt: data.updatedAt.toDate().toISOString(),
            coverImageUrl,
          } as Memory;
        });

        const resolvedMemories = await Promise.all(memoriesPromises);
        setMemories(resolvedMemories);
      } catch (error) {
        console.error("Failed to fetch memories:", error);
        toast({ variant: 'destructive', title: 'エラー', description: 'ページの読み込みに失敗しました。'});
      } finally {
        setLoading(false);
      }
    }

    fetchMemories();
  }, [user, toast]);
  
  const handleCreateNewPage = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'エラー', description: 'ログインしていません。' });
      return;
    }
    setIsCreating(true);
    try {
      const memoryDocRef = await addDoc(collection(db, 'memories'), {
        ownerUid: user.uid,
        title: '無題のページ',
        status: 'draft',
        publicPageId: null,
        coverAssetId: null,
        profileAssetId: null,
        description: '', // 'about' text
        design: {
            theme: 'light',
            fontScale: 1.0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      toast({ title: '新しいページを作成しました', description: '編集ページに移動します。' });
      router.push(`/memories/${memoryDocRef.id}`);

    } catch (error) {
      console.error("Failed to create new page:", error);
      toast({ variant: 'destructive', title: 'エラー', description: 'ページの作成に失敗しました。' });
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
       <div className="flex h-full items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">ページ一覧</h1>
          <p className="text-muted-foreground">作成した公開ページの一覧です。</p>
        </div>
        <Button onClick={handleCreateNewPage} disabled={isCreating}>
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus className="mr-2 h-4 w-4" />}
            新しいページを作成
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {memories.map((memory) => (
          <Card key={memory.id} className="flex flex-col">
            <CardHeader>
              <div className="relative aspect-video w-full mb-4">
                <Image
                  src={memory.coverImageUrl || `https://placehold.co/400x225.png`}
                  alt={memory.title}
                  data-ai-hint="memorial tribute"
                  fill
                  className="object-cover rounded-md"
                />
              </div>
              <CardTitle className="font-headline">{memory.title}</CardTitle>
               <CardDescription>
                {memory.publicPageId ? (
                    <Link href={`/p/${memory.publicPageId}`} target="_blank" className="text-xs text-primary hover:underline">
                        公開ページを表示
                    </Link>
                ) : (
                    <span className="text-xs">未公開</span>
                )}
               </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="flex items-center gap-2">
                <Badge variant={memory.status === 'active' ? 'default' : 'secondary'}>
                  {memory.status === 'active' ? '公開中' : '下書き'}
                </Badge>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/memories/${memory.id}`}>
                  <Edit className="mr-2 h-4 w-4" /> 編集
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {memories.length === 0 && !loading && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white font-headline">まだページがありません</h3>
          <p className="mt-1 text-sm text-gray-500">最初の公開ページを作成しましょう。</p>
          <div className="mt-6">
            <Button onClick={handleCreateNewPage} disabled={isCreating}>
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus className="mr-2 h-4 w-4" />}
                新しいページを作成
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
