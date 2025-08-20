// src/app/(app)/dashboard/page.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import type { Memory } from "@/lib/types";
import { PlusCircle, Edit, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [memories, setMemories] = useState<Memory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (authLoading) {
            return;
        }
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(collection(db, 'memories'), where('ownerUid', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userMemories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Memory));
            setMemories(userMemories);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching memories:", error);
            toast({ variant: 'destructive', title: 'エラー', description: 'ページの読み込みに失敗しました。'});
            setLoading(false);
        });

        return () => unsubscribe();

    }, [user, authLoading, toast]);
    
    const handleCreateNewMemory = async () => {
        if (!user) return;
        setIsCreating(true);
        try {
            const idToken = await user.getIdToken();
            const res = await fetch('/api/memories/create', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                },
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'API request failed');
            }

            const { data: newMemory } = await res.json();
            
            toast({ title: '成功', description: '新しい想い出ページが作成されました。'});
            router.push(`/memories/${newMemory.id}`);

        } catch (error: any) {
             console.error("Error creating new memory:", error);
             toast({ variant: 'destructive', title: 'エラー', description: `ページの作成に失敗しました: ${error.message}`});
        } finally {
            setIsCreating(false);
        }
    }

    if (loading || authLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight font-headline">ダッシュボード</h1>
                    <p className="text-muted-foreground">あなたの想い出ページを管理します。</p>
                </div>
                <Button onClick={handleCreateNewMemory} disabled={isCreating}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    新しいページを作成
                </Button>
            </div>
            
            {memories.length > 0 ? (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {memories.map(memory => (
                        <Card key={memory.id}>
                            <CardHeader>
                                <CardTitle className="truncate">{memory.title}</CardTitle>
                                <CardDescription>ID: {memory.id}</CardDescription>
                            </CardHeader>
                             <CardContent className="space-y-4">
                                <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                                    <Image src="https://placehold.co/600x400.png" alt="placeholder" width={600} height={400} className="rounded-md object-cover" data-ai-hint="memorial" />
                                </div>
                                <div className="flex gap-2">
                                    <Button asChild className="flex-1">
                                        <Link href={`/memories/${memory.id}`}>
                                            <Edit className="mr-2 h-4 w-4" /> 編集
                                        </Link>
                                    </Button>
                                    {memory.publicPageId && (
                                        <Button asChild variant="outline" className="flex-1">
                                            <a href={`/p/${memory.publicPageId}`} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="mr-2 h-4 w-4" /> 公開ページ
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-muted/50 rounded-lg border border-dashed">
                    <h2 className="text-xl font-semibold">まだ想い出ページがありません</h2>
                    <p className="text-muted-foreground mt-2">下のボタンから最初の想い出ページを作成しましょう。</p>
                    <p className="text-xs text-muted-foreground mt-2">（将来的には、ここで秘密鍵の入力が求められます）</p>
                    <Button onClick={handleCreateNewMemory} disabled={isCreating} className="mt-6">
                        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        最初のページを作成する
                    </Button>
                </div>
            )}
        </div>
    );
}
