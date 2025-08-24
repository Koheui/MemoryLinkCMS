
// src/app/(app)/dashboard/page.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import type { Memory, Asset } from "@/lib/types";
import { PlusCircle, Edit, ExternalLink, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase/client";
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { apiClient } from "@/lib/api-client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [memories, setMemories] = useState<Memory[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    const fetchMemoriesAndAssets = useCallback(async (uid: string) => {
        setLoading(true);
        try {
            const memoriesQuery = query(
                collection(db, 'memories'),
                where('ownerUid', '==', uid)
            );
            const assetsQuery = query(
                collection(db, 'assets'),
                where('ownerUid', '==', uid)
            );

            const [memoriesSnapshot, assetsSnapshot] = await Promise.all([
                getDocs(memoriesQuery),
                getDocs(assetsQuery)
            ]);

            const userAssets = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
            setAssets(userAssets);
            
            const getAssetUrl = (assetId: string | null) => {
                if (!assetId) return null;
                return userAssets.find(a => a.id === assetId)?.url || null;
            }

            if (memoriesSnapshot.empty) {
                // If user is authenticated but has no pages, create one for them.
                // This improves the first-time user experience.
                handleCreateNewMemory();
                return; // The creation function will handle redirection.
            }

            const userMemories = memoriesSnapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    ...data,
                    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                    coverImageUrl: getAssetUrl(data.coverAssetId)
                } as Memory;
            });
            
            userMemories.sort((a, b) => {
                const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
                const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
                return dateB - dateA;
            });

            setMemories(userMemories);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: 'destructive', title: 'エラー', description: 'ページの読み込みに失敗しました。'});
        } finally {
            setLoading(false);
        }
    }, [toast]); // handleCreateNewMemory is now stable and does not need to be a dependency.
    
    const handleCreateNewMemory = useCallback(async () => {
        if (!user || isCreating) return;
        setIsCreating(true);
        try {
            const res = await apiClient.fetch('/api/memories/create', {
                method: 'POST',
                body: JSON.stringify({ type: 'other' })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'API request failed');
            }

            const { data: newMemory } = await res.json();
            
            toast({ title: '成功', description: '新しい想い出ページが作成されました。編集画面に移動します。'});
            // Hard navigation to ensure all states are fresh on the editor page.
            window.location.assign(`/memories/${newMemory.id}`);

        } catch (error: any) {
             console.error("Error creating new memory:", error);
             toast({ variant: 'destructive', title: 'エラー', description: `ページの作成に失敗しました: ${error.message}`});
             setIsCreating(false); // Reset creation state on error
        }
        // No finally block to reset isCreating, because success leads to navigation.
    }, [user, isCreating, toast]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchMemoriesAndAssets(user.uid);
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [user, authLoading, fetchMemoriesAndAssets]);
    
    const handleDeleteMemory = async () => {
        if (!memoryToDelete || !user) return;

        setIsDeleting(true);
        try {
            const res = await apiClient.fetch('/api/memories/delete', {
                method: 'POST',
                body: JSON.stringify({ memoryId: memoryToDelete.id }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'サーバーでページの削除に失敗しました。');
            }
            
            toast({ title: "成功", description: `「${memoryToDelete.title}」を削除しました。` });
            setMemories(prev => prev.filter(m => m.id !== memoryToDelete.id));

        } catch (error: any) {
            console.error("Failed to delete memory:", error);
            toast({ variant: 'destructive', title: "削除失敗", description: error.message });
        } finally {
            setIsDeleting(false);
            setMemoryToDelete(null);
        }
    };


    if (loading || authLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        // This case is handled by AppLayout now, but as a fallback:
        return (
            <div className="text-center p-8">
                <h1 className="text-2xl font-bold">認証エラー</h1>
                <p className="text-muted-foreground">このページを表示するにはログインが必要です。</p>
            </div>
        );
    }

    if (isCreating) {
        return (
            <div className="flex h-full items-center justify-center p-4">
                 <div className="text-center py-20 bg-muted/50 rounded-lg border border-dashed w-full max-w-lg">
                    <h2 className="text-xl font-semibold">最初の想い出ページを作成中...</h2>
                    <p className="text-muted-foreground mt-2 px-4">
                        初回ログインありがとうございます。あなたのための特別なページを準備しています。
                    </p>
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
                <Button onClick={handleCreateNewMemory} disabled={isCreating}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    新しいページを作成
                </Button>
            </div>
            
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {memories.map(memory => (
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
                                <Link href={`/memories/${memory.id}`}>
                                    <Edit className="mr-2 h-4 w-4" /> 編集
                                </Link>
                            </Button>
                            {memory.publicPageId && (
                                <Button asChild variant="outline">
                                    <a href={`/p/${memory.publicPageId}`} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="mr-2 h-4 w-4" />
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
            {memories.length === 0 && !isCreating && (
                <div className="text-center py-20 bg-muted/50 rounded-lg border border-dashed">
                    <h2 className="text-xl font-semibold">まだ想い出ページがありません</h2>
                    <p className="text-muted-foreground mt-2">「新しいページを作成」ボタンから始めましょう。</p>
                </div>
            )}
        </div>
    </>
    );
}
