
// src/app/(app)/memories/new/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';


// This page now acts as a simple redirector to the dashboard.
// The dashboard itself will handle creating the first page if none exists.
export default function NewMemoryPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        // Simply redirect to the dashboard. The logic for creating a new page
        // is now handled within the dashboard itself for a better UX.
        router.replace('/dashboard');
        
    }, [user, loading, router, toast]);

    return (
        <div className="flex h-full items-center justify-center p-4">
             <div className="text-center py-20 bg-muted/50 rounded-lg border border-dashed w-full max-w-lg">
                <h2 className="text-xl font-semibold">ダッシュボードへ移動中...</h2>
                <p className="text-muted-foreground mt-2 px-4">
                    ページを準備しています。自動的にリダイレクトします。
                </p>
                 <Loader2 className="mt-6 h-8 w-8 animate-spin text-primary mx-auto" />
            </div>
        </div>
    );
}
