// src/app/(app)/memories/[memoryId]/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import type { Memory, Asset, PublicPageBlock } from '@/lib/types';
import { db, storage } from '@/lib/firebase/client';
import { doc, getDoc, collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Edit, Eye, Globe, Image as ImageIcon, Link as LinkIcon, Loader2, Mail, Mic, Milestone, Phone, Plus, Type, UploadCloud, Video } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BlockEditor } from '@/components/block-editor';


// This is the new Visual Editor Page
export default function MemoryEditorPage() {
  const params = useParams();
  const memoryId = params.memoryId as string;
  const { user, loading: authLoading } = useAuth();
  
  const [memory, setMemory] = useState<Memory | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Fetch all required data
  useEffect(() => {
    if (authLoading || !user || !memoryId) return;

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Fetch Memory
            const memoryDocRef = doc(db, 'memories', memoryId);
            const memoryDoc = await getDoc(memoryDocRef);
            if (!memoryDoc.exists() || memoryDoc.data()?.ownerUid !== user.uid) {
                return notFound();
            }
            const memoryData = memoryDoc.data() as Omit<Memory, 'id'>;
            setMemory({ id: memoryDoc.id, ...memoryData } as Memory);

            // Fetch Assets. These are now in a top-level collection per the media library update.
            // We will fetch assets belonging to this user. A more advanced implementation
            // might filter by memoryId if assets were linked, but a central library is simpler.
            const assetsQuery = query(collection(db, 'assets'), where('ownerUid', '==', user.uid), orderBy('createdAt', 'desc'));
            
            const assetsSnapshot = await getDocs(assetsQuery);
            const fetchedAssets: Asset[] = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
            setAssets(fetchedAssets);
            
        } catch (error) {
            console.error("Error fetching memory data:", error);
            return notFound();
        } finally {
            setLoading(false);
        }
    };
    
    fetchInitialData();

  }, [memoryId, user, authLoading]);

  // Pre-fetch asset URLs for display
   useEffect(() => {
    const fetchAssetUrls = async () => {
      const urls: Record<string, string> = {};
      const assetsToFetch = [
        memory?.coverAssetId,
        memory?.profileAssetId,
      ].filter(Boolean) as string[];

       const imageAssetsToFetch = assets
        .filter(asset => assetsToFetch.includes(asset.id))
        .filter(asset => !assetUrls[asset.id]);


      for (const asset of imageAssetsToFetch) {
        if (asset.storagePath) {
            try {
                const url = await getDownloadURL(ref(storage, asset.storagePath));
                urls[asset.id] = url;
            } catch (error) {
                console.error(`Failed to get URL for asset ${asset.id}:`, error);
            }
        }
      }
      if(Object.keys(urls).length > 0) {
        setAssetUrls(prev => ({ ...prev, ...urls }));
      }
    };

    if (assets.length > 0 && memory) {
      fetchAssetUrls();
    }
  }, [assets, memory, assetUrls]);


  if (loading || authLoading || !memory) {
     return (
        <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
     )
  }

  const coverImageUrl = memory.coverAssetId ? assetUrls[memory.coverAssetId] : null;
  const profileImageUrl = memory.profileAssetId ? assetUrls[memory.profileAssetId] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <div>
           <h1 className="text-xl font-bold tracking-tight font-headline">{memory.title}</h1>
           <p className="text-sm text-muted-foreground">編集モード</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            プレビュー
          </Button>
           <Button>
            公開する
          </Button>
        </div>
      </header>

      {/* Editor Canvas */}
      <div className="mx-auto max-w-3xl p-4 md:p-8">
        <main className="rounded-lg border bg-card shadow-sm">
          {/* Cover Image */}
          <div className="group relative h-48 w-full cursor-pointer overflow-hidden rounded-t-lg bg-muted/50">
            {coverImageUrl ? (
                <Image src={coverImageUrl} alt={memory.title} fill className="object-cover" />
            ) : (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-12 w-12"/>
                    <p className="mt-2 text-sm font-semibold">カバー画像を追加</p>
                </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Button size="sm" variant="secondary"><Edit className="mr-2 h-4 w-4"/>変更</Button>
            </div>
          </div>

           {/* Profile & Title Section */}
           <div className="relative mb-8 flex flex-col items-center px-6">
             <div className="group relative -mt-16 h-32 w-32 cursor-pointer overflow-hidden rounded-full border-4 border-card shadow-lg">
                {profileImageUrl ? (
                     <Image src={profileImageUrl} alt="Profile" fill className="object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted/50 text-muted-foreground">
                        <ImageIcon className="h-10 w-10"/>
                    </div>
                )}
                 <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button size="sm" variant="secondary" className="h-8 w-8 rounded-full p-0"><Edit className="h-4 w-4"/></Button>
                 </div>
             </div>
             
             <div className="group relative mt-4 w-full text-center">
                 <h1 className="text-3xl font-bold font-headline peer">{memory.title}</h1>
                 <p className="text-muted-foreground peer">{memory.description || '概要をここに追加します'}</p>
                 <Button size="sm" variant="ghost" className="absolute -right-2 -top-2 opacity-0 transition-opacity peer-hover:opacity-100 group-hover:opacity-100">
                    <Edit className="h-4 w-4"/>
                 </Button>
             </div>
           </div>

          {/* Blocks Section */}
           <div className="space-y-4 p-4 md:p-6">
             <BlockEditor memory={memory} assets={assets} />
           </div>
        </main>
      </div>

    </div>
  );
}
