// src/app/(app)/memories/new/page.tsx
'use client';
// This is a placeholder for a future "Create New Memory" page.
// For now, new memories are created via the button on the dashboard.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewMemoryPage() {
    const router = useRouter();
    useEffect(() => {
        // Redirect to dashboard as this page is not implemented yet.
        router.replace('/dashboard');
    }, [router]);

    return (
        <div>
            <p>リダイレクトしています...</p>
        </div>
    );
}
