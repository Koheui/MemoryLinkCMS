// src/app/(app)/media-library/page.tsx
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { PlusCircle, Loader2, Image as ImageIcon, Video, Mic, Trash2 } from 'lucide-react';
import type { Asset } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, query, where, orderBy, onSnapshot, collectionGroup } from 'firebase/firestore';
import { format } from 'date-fns';

export default function MediaLibraryPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSize, setTotalSize] = useState(0);
  const [storagePercentage, setStoragePercentage] = useState(0);

  const TOTAL_STORAGE_LIMIT_MB = 200;
  const TOTAL_STORAGE_LIMIT_BYTES = TOTAL_STORAGE_LIMIT_MB * 1024 * 1024;

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    }
    setLoading(true);
    
    // Use collectionGroup to query all 'assets' subcollections across all 'memories'
    const assetsQuery = query(
      collectionGroup(db, 'assets'), 
      where('ownerUid', '==', user.uid), 
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(assetsQuery, (snapshot) => {
        let currentTotalSize = 0;
        const resolvedAssets = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();
          currentTotalSize += data.size || 0;
          return {
            id: docSnapshot.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          } as Asset;
        });

        setAssets(resolvedAssets);
        setTotalSize(currentTotalSize);
        setStoragePercentage((currentTotalSize / TOTAL_STORAGE_LIMIT_BYTES) * 100);
        setLoading(false);
    }, (error) => {
      console.error("Failed to fetch assets in real-time:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  function formatBytes(bytes: number, decimals = 2) {
      if (!bytes || bytes === 0) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  
  const assetCategories: { type: Asset['type']; label: string; icon: React.ReactNode; }[] = [
      { type: 'image', label: '写真', icon: <ImageIcon className="h-5 w-5" /> },
      { type: 'video', label: '動画', icon: <Video className="h-5 w-5" /> },
      { type: 'audio', label: '音声', icon: <Mic className="h-5 w-5" /> },
  ];

  const renderAssetTable = (type: Asset['type']) => {
    const filteredAssets = assets.filter(asset => asset.type === type);

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>ファイル名</TableHead>
                    <TableHead>所属ページID</TableHead>
                    <TableHead>アップロード日</TableHead>
                    <TableHead>サイズ</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredAssets.length > 0 ? filteredAssets.map((asset) => (
                    <TableRow key={asset.id}>
                        <TableCell className="font-medium truncate max-w-xs">{asset.name}</TableCell>
                        <TableCell className="font-mono text-xs">{asset.memoryId}</TableCell>
                        <TableCell>{format(asset.createdAt as Date, 'yyyy/MM/dd')}</TableCell>
                        <TableCell>{formatBytes(asset.size || 0)}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive"/>
                            </Button>
                        </TableCell>
                    </TableRow>
                )) : (
                     <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                           このカテゴリのメディアはまだありません。
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
  };

  if (loading) {
    return (
       <div className="flex h-full items-center justify-center p-8">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">メディアライブラリ</h1>
        <p className="text-muted-foreground">アップロードした全てのメディアを管理します。</p>
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
          <CardTitle className="font-headline">メディアカテゴリ</CardTitle>
           <CardDescription>
              カテゴリを選択して、アップロード済みのメディアを表示・管理します。メディアは各ページの編集画面からアップロードしてください。
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible className="w-full" defaultValue="image">
                {assetCategories.map(({ type, label, icon }) => (
                    <AccordionItem value={type} key={type}>
                        <AccordionTrigger className="text-lg hover:no-underline flex-1 py-4 pr-4">
                            <div className="flex items-center gap-3">
                              <span className="text-primary">{icon}</span>
                              <span>{label}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           {renderAssetTable(type)}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
