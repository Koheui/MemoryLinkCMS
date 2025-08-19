// src/app/(app)/memories/[memoryId]/page.tsx
'use server';

import { ThemeSuggester } from '@/components/theme-suggester';
import { DesignEditor } from '@/components/design-editor';
import { AboutEditor } from '@/components/about-editor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Memory, Asset } from '@/lib/types';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}

async function fetchMemory(uid: string, memoryId: string): Promise<Memory> {
    const db = getFirestore();
    const memoryDoc = await db.collection('memories').doc(memoryId).get();

    if (!memoryDoc.exists) {
        notFound();
    }

    const memoryData = memoryDoc.data() as Omit<Memory, 'id'>;

    // Ensure the user owns this memory
    if (memoryData.ownerUid !== uid) {
        notFound();
    }

    return {
        id: memoryDoc.id,
        ...memoryData,
        // Convert Firestore Timestamps to ISO strings for client-side compatibility
        createdAt: memoryData.createdAt.toDate().toISOString(),
        updatedAt: memoryData.updatedAt.toDate().toISOString(),
    } as Memory;
}

async function fetchAssets(uid: string, memoryId: string): Promise<Asset[]> {
    const db = getFirestore();
    // Correctly query the subcollection
    const assetsSnapshot = await db.collection('memories').doc(memoryId).collection('assets').where('type', '==', 'image').get();
    
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
  const sessionCookie = cookies().get('__session')?.value || '';
  if (!sessionCookie) {
    notFound();
  }

  let memory: Memory;
  let assets: Asset[];
  try {
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie, true);
    memory = await fetchMemory(decodedClaims.uid, params.memoryId);
    assets = await fetchAssets(decodedClaims.uid, params.memoryId);
  } catch (error) {
     console.error("Error fetching memory or verifying session:", error);
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
                <CardTitle className="font-headline">AIテーマデザイナー</CardTitle>
                <CardDescription>
                    AIがタイトルや説明を分析し、あなたの想い出ページにぴったりのテーマを提案します。
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ThemeSuggester memory={memory} />
            </CardContent>
        </Card>

        {/* Other editor components like block editor, asset manager, etc. would go here */}
    </div>
  );
}
