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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PlusCircle, Loader2, Image as ImageIcon, Video, Mic, Trash2, Upload } from 'lucide-react';
import type { Asset } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, query, where, orderBy, getDocs, Timestamp, doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { MediaUploader } from '@/components/media-uploader';
import { apiClient } from '@/lib/api-client';

export default function MediaLibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSize, setTotalSize] = useState(0);
  const [storagePercentage, setStoragePercentage] = useState(0);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const TOTAL_STORAGE_LIMIT_MB = 200;
  const TOTAL_STORAGE_LIMIT_BYTES = TOTAL_STORAGE_LIMIT_MB * 1024 * 1024;

  const fetchAssets = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const assetsQuery = query(
        collection(db, 'assets'), 
        where('ownerUid', '==', uid), 
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(assetsQuery);

      let currentTotalSize = 0;
      const resolvedAssets = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        currentTotalSize += data.size || 0;
        return {
          id: docSnapshot.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
        } as Asset;
      });

      setAssets(resolvedAssets);
      setTotalSize(currentTotalSize);
      setStoragePercentage((currentTotalSize / TOTAL_STORAGE_LIMIT_BYTES) * 100);

    } catch (error) {
      console.error("Failed to fetch assets:", error);
      toast({
        variant: 'destructive',
        title: "メディアの読み込み失敗",
        description: "メディアの読み込み中にエラーが発生しました。しばらくしてから再度お試しください。"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    if (authLoading || !user) {
        if (!authLoading) setLoading(false);
        return;
    }
    fetchAssets(user.uid);
  }, [user, authLoading, fetchAssets]);

  const handleDeleteAsset = async () => {
    if (!assetToDelete || !user) return;

    setIsDeleting(true);
    try {
        // This asset is not part of a block, so it's a simpler delete.
        // We still use a server-side endpoint for security and atomicity.
        const res = await apiClient.fetch('/api/assets/delete', {
            method: 'POST',
            body: JSON.stringify({ assetId: assetToDelete.id }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'サーバーでアセットの削除に失敗しました。');
        }
        
        // Optimistically update UI
        setAssets(prev => prev.filter(a => a.id !== assetToDelete.id));
        setTotalSize(prev => prev - (assetToDelete.size || 0));
        setStoragePercentage(((totalSize - (assetToDelete.size || 0)) / TOTAL_STORAGE_LIMIT_BYTES) * 100);

        toast({ title: "成功", description: `${assetToDelete.name}を削除しました。` });
    } catch (error: any) {
        console.error("Failed to delete asset:", error);
        toast({ variant: 'destructive', title: "削除失敗", description: error.message });
    } finally {
        setIsDeleting(false);
        setAssetToDelete(null);
    }
  };

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
                        <TableCell className="font-mono text-xs">{asset.memoryId || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(asset.createdAt as any), 'yyyy/MM/dd')}</TableCell>
                        <TableCell>{formatBytes(asset.size || 0)}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => setAssetToDelete(asset)}>
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

  if (loading || authLoading) {
    return (
       <div className="flex h-full items-center justify-center p-8">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
     <AlertDialog open={assetToDelete !== null} onOpenChange={(open) => !open && setAssetToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>アセットを削除しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                この操作は取り消せません。アセット「{assetToDelete?.name}」をライブラリから完全に削除します。このアセットを使用しているページからも削除されます。
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAsset} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    削除
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
       <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight font-headline">メディアライブラリ</h1>
                <p className="text-muted-foreground">アップロードした全てのメディアを管理します。</p>
            </div>
            {user && (
                 <MediaUploader
                    assetType="image" // Default, can be any as it's just a trigger
                    accept="image/*,video/*,audio/*"
                    onUploadSuccess={(newAsset) => {
                      fetchAssets(user.uid); // Re-fetch all assets to reflect the new upload
                    }}
                  >
                    <Button>
                        <Upload className="mr-2 h-4 w-4" />
                        新規アップロード
                    </Button>
                </MediaUploader>
            )}
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
              カテゴリを選択して、アップロード済みのメディアを表示・管理します。メディアは各ページの編集画面からもアップロードできます。
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
    </>
  );
}
