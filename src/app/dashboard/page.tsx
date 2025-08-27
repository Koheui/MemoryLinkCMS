// src/app/dashboard/page.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import type { Memory, Asset } from "@/lib/types";
import { PlusCircle, Edit, ExternalLink, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { getFirebaseApp } from "@/lib/firebase/client";
import { getFirestore, Timestamp, doc, writeBatch, serverTimestamp, setDoc, collection, query, where, getDocs, onSnapshot, Unsubscribe, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
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

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [memories, setMemories] = useState<Memory[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);
    const router = useRouter();
    const { toast } = useToast();
    const hasCreatedInitialMemory = useRef(false);

    useEffect(() => {
        if (!user) return;

        let memoriesUnsubscribe: Unsubscribe | undefined;
        let assetsUnsubscribe: Unsubscribe | undefined;

        const setupListeners = async () => {
            setLoadingData(true);
            try {
                const app = await getFirebaseApp();
                const db = getFirestore(app);

                const memoriesQuery = query(collection(db, 'memories'), where('ownerUid', '==', user.uid));
                memoriesUnsubscribe = onSnapshot(memoriesQuery, (snapshot) => {
                    const userMemories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Memory));
                    setMemories(userMemories);
                    setLoadingData(false);
                }, (error) => {
                    console.error("Failed to fetch memories:", error);
                    toast({ variant: 'destructive', title: 'エラー', description: '想い出ページの読み込みに失敗しました。'});
                    setLoadingData(false);
                });

                const assetsQuery = query(collection(db, 'assets'), where('ownerUid', '==', user.uid));
                assetsUnsubscribe = onSnapshot(assetsQuery, (snapshot) => {
                    const userAssets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
                    setAssets(userAssets);
                }, (error) => {
                    console.error("Failed to fetch assets:", error);
                    toast({ variant: 'destructive', title: 'エラー', description: 'メディアファイルの読み込みに失敗しました。'});
                });

            } catch (error) {
                console.error("Error setting up listeners:", error);
                toast({ variant: 'destructive', title: 'エラー', description: 'データの初期化に失敗しました。'});
                setLoadingData(false);
            }
        };

        setupListeners();

        return () => {
            if (memoriesUnsubscribe) memoriesUnsubscribe();
            if (assetsUnsubscribe) assetsUnsubscribe();
        };
    }, [user, toast]);

    const handleCreateNewMemory = useCallback(async () => {
        if (!user) return;
        
        try {
            const app = await getFirebaseApp();
            const db = getFirestore(app);
            const memoryId = crypto.randomUUID();
            const memoryRef = doc(db, "memories", memoryId);
            
            const newMemoryData: Omit<Memory, 'id'> = {
                ownerUid: user.uid,
                title: "新しい想い出",
                type: 'other',
                status: 'draft',
                publicPageId: null,
                coverAssetId: null,
                profileAssetId: null,
                description: '',
                design: {
                    theme: 'light',
                    fontScale: 1,
                    bgColor: '#F9FAFB',
                    textColor: '#111827',
                    cardBgColor: '#FFFFFF',
                    cardTextColor: '#111827',
                    cardBorder: false,
                    cardBorderWidth: 1,
                    cardBorderColor: '#E5E7EB',
                },
                blocks: [],
                createdAt: serverTimestamp() as Timestamp,
                updatedAt: serverTimestamp() as Timestamp,
            };

            await setDoc(memoryRef, newMemoryData);
            
            toast({ title: '成功', description: '新しい想い出ページが作成されました。編集画面に移動します。'});
            router.push(`/memories?id=${memoryId}`);

        } catch (error: any) {
             console.error("Error creating new memory:", error);
             toast({ variant: 'destructive', title: 'エラー', description: `ページの作成に失敗しました: ${error.message}`});
        }
    }, [user, toast, router]);
    
    useEffect(() => {
        if (!authLoading && user && memories.length === 0 && !loadingData && !hasCreatedInitialMemory.current) {
            hasCreatedInitialMemory.current = true;
            handleCreateNewMemory();
        }
    }, [authLoading, loadingData, user, memories, handleCreateNewMemory]);


    const handleDeleteMemory = async () => {
        if (!memoryToDelete || !user) return;

        setIsDeleting(true);
        try {
            const app = await getFirebaseApp();
            const db = getFirestore(app);
            const storage = getStorage(app);

            const batch = writeBatch(db);

            // Step 1: Find all associated assets
            const assetsQuery = query(collection(db, 'assets'), where('memoryId', '==', memoryToDelete.id), where('ownerUid', '==', user.uid));
            const assetsSnapshot = await getDocs(assetsQuery);
            const assetsToDelete = assetsSnapshot.docs.map(d => ({id: d.id, ...d.data()} as Asset));

            // Step 2: Delete asset files from Storage and add Firestore doc deletions to the batch
            for (const asset of assetsToDelete) {
                if (asset.storagePath) {
                    const fileRef = ref(storage, asset.storagePath);
                    await deleteObject(fileRef).catch(err => {
                        console.warn(`Could not delete storage file: ${asset.storagePath}`, err);
                    });
                }
                const assetDocRef = doc(db, "assets", asset.id);
                batch.delete(assetDocRef);
            }

            // Step 3: Add the memory document deletion to the batch
            const memoryRef = doc(db, "memories", memoryToDelete.id);
            batch.delete(memoryRef);
            
            // Step 4: Commit the batch
            await batch.commit();
            
            toast({ title: "成功", description: `「${memoryToDelete.title}」を関連データごと完全に削除しました。` });
        } catch (error: any) {
            console.error("Failed to delete memory:", error);
            toast({ variant: "destructive", title: "削除失敗", description: error.message });
        } finally {
            setIsDeleting(false);
            setMemoryToDelete(null);
        }
    };
    
    const memoriesWithCovers = useMemo(() => {
        return memories.map(memory => {
            const coverImageUrl = memory.coverAssetId ? assets.find(a => a.id === memory.coverAssetId)?.url : null;
            return { ...memory, coverImageUrl };
        }).sort((a, b) => {
            const dateA = a.createdAt ? (a.createdAt as Timestamp).toMillis() : 0;
            const dateB = b.createdAt ? (b.createdAt as Timestamp).toMillis() : 0;
            return dateB - dateA;
        });
    }, [memories, assets]);


    if (authLoading || loadingData) {
        return (
            <div className="flex h-full items-center justify-center p-4">
                 <div className="text-center py-20 bg-muted/50 rounded-lg border border-dashed w-full max-w-lg">
                    <Loader2 className="mt-6 h-8 w-8 animate-spin text-primary mx-auto" />
                </div>
            </div>
        )
    }

    return (
    <>
        <AlertDialog open={memoryToDelete !== null} onOpenChange={(open) => !open && setMemoryToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                        この操作は取り消せません。ページ「{memoryToDelete?.title}」を完全に削除します。
                        これには、ページに関連付けられた全ての写真、動画、音声ファイルが含まれ、全て完全に削除されます。
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteMemory} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        削除する
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row items-start md:flex-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight font-headline">ダッシュボード</h1>
                    <p className="text-muted-foreground">あなたの想い出ページを管理します。</p>
                </div>
                <Button onClick={handleCreateNewMemory}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    新しいページを作成
                </Button>
            </div>
            
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {memoriesWithCovers.map(memory => (
                    <Card key={memory.id} className="flex flex-col overflow-hidden">
                        <CardContent className="p-0">
                            <div className="aspect-video bg-muted relative">
                                <Image 
                                    src={memory.coverImageUrl || "https://placehold.co/600x400.png"} 
                                    alt={memory.title} 
                                    fill
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    className="object-cover" 
                                    data-ai-hint="memorial" 
                                />
                            </div>
                        </CardContent>
                        <CardHeader className="flex-grow">
                            <CardTitle className="truncate">{memory.title}</CardTitle>
                            <CardDescription>ID: {memory.id}</CardDescription>
                        </CardHeader>
                        <CardFooter className="flex gap-2 bg-muted/50 p-3">
                            <Button asChild className="flex-1">
                                <Link href={`/memories?id=${memory.id}`}>
                                    <Edit className="mr-2 h-4 w-4" /> 編集
                                </Link>
                            </Button>
                            {memory.publicPageId && (
                                <Button asChild variant="ghost" size="icon" title="公開ページを開く">
                                    <a href={`/p?id=${memory.publicPageId}`} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </Button>
                            )}
                             <Button variant="destructive-outline" size="icon" onClick={() => setMemoryToDelete(memory)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
            {memoriesWithCovers.length === 0 && !authLoading && !loadingData && (
                <div className="text-center py-20 bg-muted/50 rounded-lg border border-dashed">
                    <h2 className="text-xl font-semibold">まだ想い出ページがありません</h2>
                    <p className="text-muted-foreground mt-2">「新しいページを作成」ボタンから始めましょう。</p>
                </div>
            )}
        </div>
    </>
    );
}
