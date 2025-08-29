
// src/app/media-library/page.tsx
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
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
import { PlusCircle, Loader2, Image as ImageIcon, Video, Mic, Trash2, Upload, GripVertical, Check, X } from 'lucide-react';
import type { Asset } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { getFirebaseApp } from '@/lib/firebase/client';
import { getFirestore, collection, query, where, orderBy, getDocs, Timestamp, writeBatch, doc, onSnapshot, Unsubscribe, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { MediaUploader } from '@/components/media-uploader';
import { VideoThumbnail } from '@/components/video-thumbnail';
import { AudioThumbnail } from '@/components/audio-thumbnail';
import { cn } from '@/lib/utils';


export default function MediaLibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSize, setTotalSize] = useState(0);
  const [storagePercentage, setStoragePercentage] = useState(0);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const { toast } = useToast();

  const TOTAL_STORAGE_LIMIT_MB = 1000 * 1000; // Effectively unlimited for testing
  const TOTAL_STORAGE_LIMIT_BYTES = TOTAL_STORAGE_LIMIT_MB * 1024 * 1024;

  useEffect(() => {
    if (!user) {
        if (!authLoading) setLoading(false);
        return;
    };

    let unsubscribe: Unsubscribe | undefined;
    const setupListener = async () => {
        setLoading(true);
        try {
            const app = getFirebaseApp();
            const db = getFirestore(app);
            const assetsQuery = query(
                collection(db, 'assets'), 
                where('ownerUid', '==', user.uid), 
                orderBy('createdAt', 'desc')
            );
            
            unsubscribe = onSnapshot(assetsQuery, (snapshot) => {
                let currentTotalSize = 0;
                const resolvedAssets = snapshot.docs.map((docSnapshot) => {
                    const data = docSnapshot.data() as Asset;
                    currentTotalSize += data.size || 0;
                    return data;
                });

                setAssets(resolvedAssets);
                setTotalSize(currentTotalSize);
                setStoragePercentage((currentTotalSize / TOTAL_STORAGE_LIMIT_BYTES) * 100);
                setLoading(false);
            }, (error) => {
                console.error("Failed to fetch assets:", error);
                toast({
                    variant: 'destructive',
                    title: "メディアの読み込み失敗",
                    description: "メディアの読み込み中にエラーが発生しました。しばらくしてから再度お試しください。"
                });
                setLoading(false);
            });
        } catch (error) {
            console.error("Error setting up listener:", error);
            toast({ variant: 'destructive', title: 'エラー', description: 'データの初期化に失敗しました。'});
            setLoading(false);
        }
    };
    
    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, authLoading, toast]);

  const handleDeleteAssets = async (assetIds: string[]) => {
    if (!user || assetIds.length === 0) return;
  
    setIsDeleting(true);
    const assetsToDelete = assets.filter(a => assetIds.includes(a.assetId));
  
    try {
      const app = getFirebaseApp();
      const storage = getStorage(app);
      const db = getFirestore(app);

      // Sequentially delete each asset and its corresponding file
      for (const asset of assetsToDelete) {
        // Delete the file from Firebase Storage first
        if (asset.storagePath) {
          const fileRef = ref(storage, asset.storagePath);
          await deleteObject(fileRef).catch(error => {
            if (error.code !== 'storage/object-not-found') {
              console.error(`Failed to delete ${asset.storagePath} from Storage:`, error);
              throw error; 
            }
          });
        }
        
        // Then delete the document from Firestore
        const assetRef = doc(db, "assets", asset.assetId);
        await deleteDoc(assetRef);
      }
  
      toast({ title: "成功", description: `${assetIds.length}件のアセットを削除しました。` });
  
    } catch (error: any) {
      console.error("Failed to delete asset(s):", error);
      toast({ variant: 'destructive', title: "削除失敗", description: error.message });
    } finally {
      setIsDeleting(false);
      setAssetToDelete(null); 
      setSelectedAssets([]);
    }
  };

  const handleSelectionChange = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  }

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

  const renderAssetList = (type: Asset['type']) => {
    const filteredAssets = assets.filter(asset => asset.type === type);

    if (type === 'image') {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredAssets.length > 0 ? filteredAssets.map(asset => {
                    const isSelected = selectedAssets.includes(asset.assetId);
                    return (
                        <Card 
                            key={asset.assetId} 
                            className={cn(
                                "overflow-hidden relative group cursor-pointer transition-all duration-200",
                                isSelected ? "ring-2 ring-primary ring-offset-2" : "ring-0"
                            )}
                            onClick={() => handleSelectionChange(asset.assetId)}
                        >
                            <div className="absolute top-2 left-2 z-10">
                               <Checkbox 
                                 checked={isSelected}
                                 onCheckedChange={() => handleSelectionChange(asset.assetId)}
                                 className="h-5 w-5 bg-background/80 border-white/80 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                               />
                            </div>
                             <button 
                                className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-black/50 text-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80"
                                onClick={(e) => { e.stopPropagation(); setAssetToDelete(asset); }}
                            >
                               <Trash2 className="h-4 w-4" />
                            </button>
                            <CardContent className="p-0">
                                <div className="aspect-square relative">
                                    <Image 
                                        src={asset.url}
                                        alt={asset.assetId}
                                        fill
                                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                                        className="object-cover"
                                        data-ai-hint="gallery photo"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    );
                }) : (
                     <div className="col-span-full text-center py-10">
                        このカテゴリのメディアはまだありません。
                    </div>
                )}
            </div>
        )
    }

    if (type === 'video') {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredAssets.length > 0 ? filteredAssets.map(asset => {
                    const isSelected = selectedAssets.includes(asset.assetId);
                    return (
                        <VideoThumbnail
                            key={asset.assetId}
                            asset={asset}
                            isSelected={isSelected}
                            onSelectionChange={handleSelectionChange}
                            onDelete={setAssetToDelete}
                        />
                    );
                }) : (
                     <div className="col-span-full text-center py-10">
                        このカテゴリのメディアはまだありません。
                    </div>
                )}
            </div>
        )
    }

    if (type === 'audio') {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredAssets.length > 0 ? filteredAssets.map(asset => {
                    const isSelected = selectedAssets.includes(asset.assetId);
                    return (
                        <AudioThumbnail
                            key={asset.assetId}
                            asset={asset}
                            isSelected={isSelected}
                            onSelectionChange={handleSelectionChange}
                            onDelete={setAssetToDelete}
                        />
                    );
                }) : (
                     <div className="col-span-full text-center py-10">
                        このカテゴリのメディアはまだありません。
                    </div>
                )}
            </div>
        )
    }

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
                    <TableRow key={asset.assetId}>
                        <TableCell className="font-medium truncate max-w-xs">{asset.assetId}</TableCell>
                        <TableCell className="font-mono text-xs">{asset.memoryId || 'N/A'}</TableCell>
                        <TableCell>{asset.createdAt && format(asset.createdAt as Date, 'yyyy/MM/dd')}</TableCell>
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
                この操作は取り消せません。アセット「{assetToDelete?.assetId}」をライブラリから完全に削除します。このアセットを使用しているページからも削除されます。
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteAssets(assetToDelete ? [assetToDelete.assetId] : [])} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
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
                    assetType="image"
                    accept="image/*,video/*,audio/*"
                    onUploadSuccess={(newAsset) => {
                      // The onSnapshot listener will handle the state update automatically.
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
                    合計 {formatBytes(totalSize)} / 無制限 を使用中
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Progress value={storagePercentage} className="w-full" />
            </CardContent>
        </Card>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                 <div>
                    <CardTitle className="font-headline">メディアカテゴリ</CardTitle>
                    <CardDescription>
                        カテゴリを選択してメディアを管理します。写真、動画、音声は複数選択して一括操作できます。
                    </CardDescription>
                </div>
                 {selectedAssets.length > 0 && (
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-primary">{selectedAssets.length}件のメディアを選択中</span>
                        <Button variant="destructive" onClick={() => handleDeleteAssets(selectedAssets)} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            選択した項目を削除
                        </Button>
                    </div>
                 )}
            </div>
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
                           {renderAssetList(type)}
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
