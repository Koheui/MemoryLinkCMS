// src/app/(app)/dashboard/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase/client';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

// This is a client-side component to handle the redirect after login.
// It fetches the user's memory ID and redirects to the correct editor page.
export default function DashboardRedirectPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) {
            return; // Wait until user state is resolved
        }
        if (!user) {
            router.replace('/login'); // Should not happen if middleware is correct, but as a safeguard
            return;
        }

        const fetchMemoryAndRedirect = async () => {
            const memoriesCollectionRef = collection(db, 'memories');
            const q = query(memoriesCollectionRef, where('ownerUid', '==', user.uid), limit(1));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const memoryId = querySnapshot.docs[0].id;
                router.replace(`/memories/${memoryId}`);
            } else {
                // This might happen in an edge case. Redirect to account page.
                console.warn("No memory page found for user. Redirecting to account.");
                router.replace('/account');
            }
        };

        fetchMemoryAndRedirect();

    }, [user, loading, router]);
    
    return (
        <div className="flex h-screen items-center justify-center">
            <div className="flex items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-lg text-muted-foreground">読み込み中...</span>
            </div>
        </div>
    );
}
