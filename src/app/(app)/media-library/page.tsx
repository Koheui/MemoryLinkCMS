
// src/app/(app)/media-library/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Loader2, Image as ImageIcon, Video, Mic, FileText, Trash2 } from 'lucide-react';
import type { Asset } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/client';
import { collectionGroup, query, where, getDocs, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';

function formatBytes(bytes: number, decimals = 2) {  
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const TOTAL_STORAGE_LIMIT_MB = 200;
const TOTAL_STORAGE_LIMIT_BYTES = TOTAL_STORAGE_LIMIT_MB * 1024 * 1024;

const assetIcons: Record<Asset['type'], React.ReactNode> = {
  image: <ImageIcon className="h-5 w-5 text-muted-foreground" />,
  video: <Video className="h-5 w-5 text-muted-foreground" />,
  audio: <Mic className="h-5 w-5 text-muted-foreground" />,
  // Assuming a 'text' type might be added later based on user request
  // text: <FileText className="h-5 w-5 text-muted-foreground" />,
};


export default function MediaLibraryPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    if (!user) return;

    async function fetchAssets() {
      setLoading(true);
      try {
        // Firestore doesn't allow querying across all subcollections of a user directly.
        // A collection group query is needed. This requires an index.
        // The query is on the `assets` collection group.
        const assetsCollectionGroup = collectionGroup(db, 'assets');
        const q = query(assetsCollectionGroup, where('ownerUid', '==', user.uid), orderBy('createdAt', 'desc'));
        const assetsSnapshot = await getDocs(q);

        if (assetsSnapshot.empty) {
          setAssets([]);
          setTotalSize(0);
          setLoading(false);
          return;
        }

        let currentTotalSize = 0;
        const resolvedAssets = assetsSnapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();
          currentTotalSize += data.size || 0;
          return {
            id: docSnapshot.id,
            ...data,
            createdAt: data.createdAt.toDate(),
          } as Asset;
        });

        setAssets(resolvedAssets);
        setTotalSize(currentTotalSize);

      } catch (error) {
        console.error("Failed to fetch assets:", error);
        // This might fail if the composite index is not created yet.
        // You need to create an index on `assets` collection group: `ownerUid` ASC, `createdAt` DESC.
      } finally {
        setLoading(false);
      }
    }

    fetchAssets();
  }, [user]);

  const storagePercentage = (totalSize / TOTAL_STORAGE_LIMIT_BYTES) * 100;

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
          <h1 className="text-2xl font-bold tracking-tight font-headline">メディアライブラリ</h1>
          <p className="text-muted-foreground">アップロードした全てのメディアを管理します。</p>
        </div>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> メディアをアップロード
        </Button>
      </div>
      
       <Card>
            <CardHeader>
                <CardTitle className="font-headline">ストレージ使用量</CardTitle>
                <CardDescription>
                    合計 {formatBytes(totalSize)} / {TOTAL_STORAGE_LIMIT_MB}MB を使用中
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Progress value={storagePercentage} className="w-full" />
            </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">アップロード済みメディア</CardTitle>
           <CardDescription>
              これまでにアップロードした全ての写真、動画、音声ファイルです。
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]">タイプ</TableHead>
                        <TableHead>ファイル名</TableHead>
                        <TableHead>アップロード日</TableHead>
                        <TableHead>サイズ</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {assets.map((asset) => (
                        <TableRow key={asset.id}>
                            <TableCell>{assetIcons[asset.type] || <FileText />}</TableCell>
                            <TableCell className="font-medium">{asset.name}</TableCell>
                            <TableCell>{format(asset.createdAt as Date, 'yyyy/MM/dd')}</TableCell>
                            <TableCell>{formatBytes(asset.size || 0)}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {assets.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">
                                メディアはまだアップロードされていません。
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
