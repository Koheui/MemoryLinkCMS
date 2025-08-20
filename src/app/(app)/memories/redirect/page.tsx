// src/app/(app)/memories/redirect/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { Loader2 } from 'lucide-react';

async function getMemoryIdForUser(uid: string): Promise<string | null> {
    try {
        const db = getFirestore(getAdminApp());
        const memoriesQuery = db.collection('memories')
            .where('ownerUid', '==', uid)
            .limit(1);
        
        const snapshot = await memoriesQuery.get();
        if (snapshot.empty) {
            console.warn(`No memory found for user ${uid} during redirect.`);
            return null;
        }
        return snapshot.docs[0].id;
    } catch (error) {
        console.error(`Error fetching memoryId for user ${uid} on server:`, error);
        return null;
    }
}

// This is a server component that handles redirection after login.
// It's faster than client-side redirection because it avoids loading unnecessary pages.
export default async function MemoryRedirectPage() {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    if (!sessionCookie) {
        // Not authenticated, send back to login
        redirect('/login');
    }

    let uid: string;
    try {
        const decodedClaims = await getAuth(getAdminApp()).verifySessionCookie(sessionCookie, true);
        uid = decodedClaims.uid;
    } catch (error) {
        // Invalid session cookie, send back to login
        console.error("Session cookie verification failed:", error);
        redirect('/login');
    }

    const memoryId = await getMemoryIdForUser(uid);

    if (memoryId) {
        redirect(`/memories/${memoryId}`);
    } else {
        // If no memory page exists, maybe redirect to a creation page or dashboard.
        // For now, we'll redirect to the account page as a fallback.
        console.log(`Redirecting user ${uid} to /account as no memory was found.`);
        redirect('/account');
    }
    
    // This part should ideally not be reached due to redirects.
    // It serves as a fallback UI while the server logic executes.
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">ページへ移動しています...</p>
            </div>
        </div>
    );
}
