// src/app/(app)/dashboard/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { Memory } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';


export default function DashboardPage() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

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
            const assetDocRef = doc(db, 'memories', docSnapshot.id, 'assets', data.coverAssetId);
            const assetDoc = await getDoc(assetDocRef);
            if (assetDoc.exists()) {
              const assetData = assetDoc.data();
              // In a real app, you might need to get a download URL if storage rules are tight
              if (assetData?.url) { // Assuming URL is stored on asset creation
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
        // Handle error (e.g., show toast)
      } finally {
        setLoading(false);
      }
    }

    fetchMemories();
  }, [user]);

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
          <h1 className="text-2xl font-bold tracking-tight font-headline">ダッシュボード</h1>
          <p className="text-muted-foreground">作成した想い出ページ一覧</p>
        </div>
        <Button asChild>
          <Link href="/memories/new">
            <PlusCircle className="mr-2 h-4 w-4" /> 新しい想い出を作成
          </Link>
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

      {memories.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white font-headline">まだ想い出が作成されていません</h3>
          <p className="mt-1 text-sm text-gray-500">新しい想い出ページを作成しましょう。</p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/memories/new">
                <PlusCircle className="mr-2 h-4 w-4" /> 新しい想い出を作成
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
