// src/app/(app)/memories/[memoryId]/page.tsx
'use server';

import { ThemeSuggester } from '@/components/theme-suggester';
import { DesignEditor } from '@/components/design-editor';
import { AboutEditor } from '@/components/about-editor';
import { BlockEditor } from '@/components/block-editor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Memory, Asset } from '@/lib/types';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { notFound } from 'next/navigation';

// Note: UID check is now handled by client-side hooks and middleware.
// This server component focuses only on fetching data based on the provided ID.

async function fetchMemory(memoryId: string): Promise<Memory> {
    getAdminApp(); // Ensure admin app is initialized
    const db = getFirestore();
    const memoryDoc = await db.collection('memories').doc(memoryId).get();

    if (!memoryDoc.exists) {
        notFound();
    }

    const memoryData = memoryDoc.data() as Omit<Memory, 'id'>;

    return {
        id: memoryDoc.id,
        ...memoryData,
        // Convert Firestore Timestamps to ISO strings for client-side compatibility
        createdAt: memoryData.createdAt.toDate().toISOString(),
        updatedAt: memoryData.updatedAt.toDate().toISOString(),
    } as Memory;
}

async function fetchAssets(memoryId: string): Promise<Asset[]> {
    getAdminApp();
    const db = getFirestore();
    const assetsSnapshot = await db.collection('memories').doc(memoryId).collection('assets').orderBy('createdAt', 'desc').get();
    
    if (assetsSnapshot.empty) {
        return [];
    }

    const assets: Asset[] = assetsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            // FirestoreのTimestampをJSONでシリアライズ可能な形式に変換
            createdAt: data.createdAt.toDate().toISOString(),
        } as Asset;
    });

    return assets;
}


export default async function MemoryEditorPage({ params }: { params: { memoryId: string } }) {
  let memory: Memory;
  let assets: Asset[];
  try {
    memory = await fetchMemory(params.memoryId);
    assets = await fetchAssets(params.memoryId);
  } catch (error) {
     console.error("Error fetching memory data:", error);
     // This could be a permissions issue or invalid ID.
     // notFound() will be called inside fetchMemory for most cases.
     // For other errors, we might want a generic error page.
     notFound();
  }

  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-2xl font-bold tracking-tight font-headline">想い出の編集</h1>
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
                    想い出ページの冒頭に表示される紹介文です。Markdown形式で記述できます。
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
                    AIがタイトルや説明を分析し、あなたの想い出ページにぴったりのテーマを提案します。
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ThemeSuggester memory={memory} />
            </CardContent>
        </Card>
    </div>
  );
}
