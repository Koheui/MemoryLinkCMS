// src/app/(app)/memories/new/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';


// This page now acts as an automatic creator and redirector.
export default function NewMemoryPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (loading || !user) return;

        const createMemory = async () => {
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
                router.replace(`/memories/${newMemory.id}`);

            } catch (error: any) {
                console.error("Error creating new memory:", error);
                toast({ variant: 'destructive', title: 'エラー', description: `ページの作成に失敗しました: ${error.message}`});
                router.replace('/dashboard'); // Redirect to dashboard on failure
            }
        };

        createMemory();

    }, [user, loading, router, toast]);

    return (
        <div className="flex h-full items-center justify-center p-4">
             <div className="text-center py-20 bg-muted/50 rounded-lg border border-dashed w-full max-w-lg">
                <h2 className="text-xl font-semibold">想い出ページを作成中...</h2>
                <p className="text-muted-foreground mt-2 px-4">
                    あなたのための特別なページを準備しています。自動的にリダイレクトします。
                </p>
                 <Loader2 className="mt-6 h-8 w-8 animate-spin text-primary mx-auto" />
            </div>
        </div>
    );
}
