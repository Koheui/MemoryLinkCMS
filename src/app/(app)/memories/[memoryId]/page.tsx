
// src/app/(app)/memories/[memoryId]/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import type { Memory, Asset } from '@/lib/types';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, collection, query, orderBy, where, collectionGroup, onSnapshot } from 'firebase/firestore';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Eye, Loader2, Wand2, Image as ImageIcon, FileText, Blocks } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { BlockEditor } from '@/components/block-editor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AboutEditor } from '@/components/about-editor';
import { DesignEditor } from '@/components/design-editor';
import { ThemeSuggester } from '@/components/theme-suggester';


// This is the new Visual Editor Page
export default function MemoryEditorPage() {
  const params = useParams();
  const memoryId = params.memoryId as string;
  const { user, loading: authLoading } = useAuth();
  
  const [memory, setMemory] = useState<Memory | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all required data
  useEffect(() => {
    if (authLoading || !user || !memoryId) return;

    const fetchMemory = async () => {
        setLoading(true);
        try {
            const memoryDocRef = doc(db, 'memories', memoryId);
            const memoryDoc = await getDoc(memoryDocRef);
            if (!memoryDoc.exists() || memoryDoc.data()?.ownerUid !== user.uid) {
                return notFound();
            }
            const memoryData = memoryDoc.data() as Omit<Memory, 'id'>;
            setMemory({ id: memoryDoc.id, ...memoryData } as Memory);
        } catch (error) {
            console.error("Error fetching memory data:", error);
            return notFound();
        } finally {
            setLoading(false);
        }
    };
    
    fetchMemory();

    const assetsQuery = query(collectionGroup(db, 'assets'), where('ownerUid', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribeAssets = onSnapshot(assetsQuery, (snapshot) => {
        const fetchedAssets: Asset[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        setAssets(fetchedAssets);
    }, (error) => {
        console.error("Error fetching assets:", error);
    });

    return () => {
      unsubscribeAssets();
    }

  }, [memoryId, user, authLoading]);


  if (loading || authLoading || !memory) {
     return (
        <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
     )
  }
  
  const publicUrl = `${window.location.origin.replace('app.', 'mem.')}/p/${memory.publicPageId || memory.id}`;


  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 sm:px-6">
        <div>
           <h1 className="text-xl font-bold tracking-tight font-headline">{memory.title}</h1>
           <p className="text-sm text-muted-foreground">編集モード</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="mr-2 h-4 w-4" />
                プレビュー
            </a>
          </Button>
           <Button>
            公開する
          </Button>
        </div>
      </header>

      {/* Editor Canvas */}
       <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <ImageIcon className="text-primary"/>
                    デザインとテーマ
                </CardTitle>
                <CardDescription>カバー画像、プロフィール画像、全体のテーマなどをカスタマイズします。</CardDescription>
            </CardHeader>
            <CardContent>
                <DesignEditor memory={memory} assets={assets} />
            </CardContent>
             <CardHeader className="pt-0">
                <CardTitle className="font-headline flex items-center gap-2">
                    <Wand2 className="text-primary" />
                    AIテーマ提案
                </CardTitle>
                <CardDescription>AIがページの内容から最適なテーマを提案します。</CardDescription>
            </CardHeader>
            <CardContent>
                <ThemeSuggester memory={memory} />
            </CardContent>
          </Card>

           <Card>
              <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                      <FileText className="text-primary" />
                      概要
                  </CardTitle>
                  <CardDescription>ページ上部に表示されるタイトルと紹介文を編集します。</CardDescription>
              </CardHeader>
              <CardContent>
                  <AboutEditor memory={memory} />
              </CardContent>
          </Card>
          
           <Card>
              <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                      <Blocks className="text-primary" />
                      コンテンツブロック
                  </CardTitle>
                  <CardDescription>ページの本体となるコンテンツブロックを追加・編集・並び替えします。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <BlockEditor memory={memory} assets={assets} />
              </CardContent>
          </Card>
       </main>
    </div>
  );
}
