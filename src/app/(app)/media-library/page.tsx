// src/app/(app)/media-library/page.tsx
'use client';

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
import { MediaUploader } from '@/components/media-uploader';
import { PlusCircle, Loader2, Image as ImageIcon, Video, Mic, FileText, Trash2, Folder, Film } from 'lucide-react';
import type { Asset } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';

export default function MediaLibraryPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    }
    setLoading(true);
    const assetsCollectionRef = collection(db, 'assets');
    const q = query(assetsCollectionRef, where('ownerUid', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        let currentTotalSize = 0;
        const resolvedAssets = snapshot.docs.map((docSnapshot) => {
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
        setLoading(false);
    }, (error) => {
      console.error("Failed to fetch assets in real-time:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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
  const storagePercentage = (totalSize / TOTAL_STORAGE_LIMIT_BYTES) * 100;

  const assetCategories: { type: Asset['type']; label: string; icon: React.ReactNode; uploaderType: 'image' | 'video' | 'audio' | 'text' | 'album' | 'video_album', accept: string }[] = [
      { type: 'image', label: '写真', icon: <ImageIcon className="h-5 w-5" />, uploaderType: 'image', accept: 'image/*' },
      { type: 'album', label: 'アルバム', icon: <Folder className="h-5 w-5" />, uploaderType: 'album', accept: '' },
      { type: 'video', label: '動画', icon: <Video className="h-5 w-5" />, uploaderType: 'video', accept: 'video/*' },
      { type: 'video_album', label: '動画アルバム', icon: <Film className="h-5 w-5" />, uploaderType: 'video_album', accept: ''},
      { type: 'text', label: 'テキスト', icon: <FileText className="h-5 w-5" />, uploaderType: 'text', accept: ''},
      { type: 'audio', label: '音声', icon: <Mic className="h-5 w-5" />, uploaderType: 'audio', accept: 'audio/*' },
  ];

  const renderAssetTable = (type: Asset['type']) => {
    const filteredAssets = assets.filter(asset => asset.type === type);

    if (type === 'album' || type === 'video_album' || type === 'text') {
        return (
             <div className="text-center py-10 border-2 border-dashed rounded-lg m-4">
                <h3 className="text-sm font-semibold text-muted-foreground">この機能は準備中です</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {type === 'album' && 'まず写真をアップロードしてください。写真を選択してアルバムを作成できます。'}
                  {type === 'video_album' && 'まず動画をアップロードしてください。動画を選択してアルバムを作成できます。'}
                  {type === 'text' && 'テキストブロックは公開ページエディタで直接追加します。'}
                </p>
             </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>ファイル名</TableHead>
                    <TableHead>アップロード日</TableHead>
                    <TableHead>サイズ</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredAssets.length > 0 ? filteredAssets.map((asset) => (
                    <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.name}</TableCell>
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
                        <TableCell colSpan={4} className="text-center h-24">
                           このカテゴリのメディアはまだありません。
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
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
            </Header>
            <CardContent>
                <Progress value={storagePercentage} className="w-full" />
            </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">メディアカテゴリ</CardTitle>
           <CardDescription>
              カテゴリを選択して、アップロード済みのメディアを表示・管理します。
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible className="w-full" defaultValue="image">
                {assetCategories.map(({ type, label, icon, uploaderType, accept }) => (
                    <AccordionItem value={type} key={type}>
                        <AccordionTrigger className="text-lg hover:no-underline">
                           <div className="flex items-center gap-3">
                             <span className="text-primary">{icon}</span>
                             <span>{label}</span>
                           </div>
                           <MediaUploader
                              type={uploaderType}
                              accept={accept}
                              onUploadSuccess={() => { /* can be used to refresh list if needed */ }}
                            >
                               <Button size="sm" onClick={(e) => e.stopPropagation()}>
                                  <PlusCircle className="mr-2 h-4 w-4"/>
                                  新規アップロード
                              </Button>
                           </MediaUploader>
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
