// src/app/(app)/memories/[memoryId]/page.tsx
'use client';

import { ThemeSuggester } from '@/components/theme-suggester';
import { DesignEditor } from '@/components/design-editor';
import { AboutEditor } from '@/components/about-editor';
import { BlockEditor } from '@/components/block-editor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Memory, Asset } from '@/lib/types';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';


export default function MemoryEditorPage({ params }: { params: { memoryId: string } }) {
  const { user, loading: authLoading } = useAuth();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        // This should be handled by layout, but as a safeguard
        notFound();
        return;
    };

    const fetchMemory = async () => {
        const memoryDocRef = doc(db, 'memories', params.memoryId);
        const memoryDoc = await getDoc(memoryDocRef);

        if (!memoryDoc.exists() || memoryDoc.data()?.ownerUid !== user.uid) {
            notFound();
            return;
        }

        const memoryData = memoryDoc.data() as Omit<Memory, 'id'>;
        setMemory({
             id: memoryDoc.id,
            ...memoryData,
            createdAt: memoryData.createdAt.toDate().toISOString(),
            updatedAt: memoryData.updatedAt.toDate().toISOString(),
        } as Memory);
    };

    const fetchAssets = async () => {
        const assetsSnapshot = await getDocs(query(collection(db, 'memories', params.memoryId, 'assets'), orderBy('createdAt', 'desc')));
        
        const fetchedAssets: Asset[] = assetsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt.toDate().toISOString(),
            } as Asset;
        });
        setAssets(fetchedAssets);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([fetchMemory(), fetchAssets()]);
        } catch (error) {
            console.error("Error fetching memory data:", error);
            notFound();
        } finally {
            setLoading(false);
        }
    }
    
    loadData();

  }, [params.memoryId, user, authLoading]);

  if (loading || authLoading || !memory) {
     return (
        <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
     )
  }

  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-2xl font-bold tracking-tight font-headline">ページの編集</h1>
            <p className="text-muted-foreground">編集中のページ: <span className="font-semibold text-primary">{memory.title}</span></p>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">デザイン</CardTitle>
                <CardDescription>
                    公開ページの見た目をカスタマイズします。カバー画像、プロフィール写真、テーマ、フォントサイズなどを設定できます。
                </CardDescription>
            </CardHeader>
            <CardContent>
                <DesignEditor memory={memory} assets={assets} />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="font-headline">概要</CardTitle>
                <CardDescription>
                    ページの冒頭に表示される紹介文です。Markdown形式で記述できます。
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AboutEditor memory={memory} />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="font-headline">コンテンツブロック</CardTitle>
                <CardDescription>
                    写真アルバム、動画、テキストなど、ページに表示するコンテンツを自由に追加・並べ替えできます。
                </CardDescription>
            </CardHeader>
            <CardContent>
                <BlockEditor memory={memory} assets={assets} />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="font-headline">AIテーマデザイナー</CardTitle>
                <CardDescription>
                    AIがタイトルや説明を分析し、あなたのページにぴったりのテーマを提案します。
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ThemeSuggester memory={memory} />
            </CardContent>
        </Card>
    </div>
  );
}
