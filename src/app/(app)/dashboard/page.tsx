
// src/app/(app)/dashboard/page.tsx
'use server';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { Memory } from '@/lib/types';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}

const db = getFirestore();
const storage = getStorage();

async function getAssetUrl(path: string | undefined | null): Promise<string | null> {
    if (!path) return null;
    try {
        const fileRef = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).file(path);
        const [url] = await fileRef.getSignedUrl({
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        });
        return url;
    } catch (error) {
        console.error(`Failed to get signed URL for ${path}`, error);
        return null;
    }
}


async function fetchMemories(uid: string): Promise<Memory[]> {
    const memoriesSnapshot = await db.collection('memories').where('ownerUid', '==', uid).orderBy('createdAt', 'desc').get();
    
    if (memoriesSnapshot.empty) {
        return [];
    }

    const memoriesPromises = memoriesSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        let coverImageUrl: string | null = `https://placehold.co/400x225.png`;
        
        if (data.coverAssetId) {
             const assetDoc = await db.collection('memories').doc(doc.id).collection('assets').doc(data.coverAssetId).get();
             if (assetDoc.exists) {
                const assetData = assetDoc.data();
                const url = await getAssetUrl(assetData?.rawPath);
                if(url) coverImageUrl = url;
             }
        }

        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt.toDate().toISOString(), 
            updatedAt: data.updatedAt.toDate().toISOString(),
            coverImageUrl,
        } as Memory;
    });

    return Promise.all(memoriesPromises);
}


export default async function DashboardPage() {
  const sessionCookie = cookies().get('__session')?.value || '';
  if (!sessionCookie) {
    redirect('/login');
  }

  let memories: Memory[] = [];
  try {
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie, true);
    memories = await fetchMemories(decodedClaims.uid);
  } catch (error) {
     console.error("Error fetching memories or verifying session:", error);
     redirect('/login');
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
              <CardDescription>種別: <span className="capitalize">{memory.type}</span></CardDescription>
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
