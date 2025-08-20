
// src/app/(app)/memories/redirect/page.tsx
import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { Loader2 } from 'lucide-react';

async function getMemoryIdForUser(uid: string): Promise<string | null> {
    try {
        const db = getFirestore(getAdminApp());
        const memoriesQuery = db.collection('memories').where('ownerUid', '==', uid).limit(1);
        const snapshot = await memoriesQuery.get();

        if (snapshot.empty) {
            console.warn(`No memory found for user ${uid} during redirect.`);
            return null;
        }
        return snapshot.docs[0].id;
    } catch (error) {
        console.error(`Error fetching memoryId for user ${uid} in redirect page:`, error);
        return null;
    }
}

// This is a server component that will handle redirection
export default async function MemoryRedirectPage() {
    const cookieStore = cookies();
    const idToken = cookieStore.get('idToken')?.value;

    let uid: string | null = null;
    if (idToken) {
        try {
            const adminApp = getAdminApp();
            const decodedToken = await adminApp.auth().verifyIdToken(idToken);
            uid = decodedToken.uid;
        } catch (error) {
            console.warn("Redirect page: Invalid idToken cookie.", error);
            // If token is invalid, redirect to login
            redirect('/login');
        }
    } else {
        // This case might happen if the page is accessed directly without being logged in.
        redirect('/login');
    }

    if (uid) {
        const memoryId = await getMemoryIdForUser(uid);
        if (memoryId) {
            redirect(`/memories/${memoryId}`);
        } else {
            // If no memory page is found (e.g., an error in creation), redirect to account page as a fallback.
            redirect('/account');
        }
    }
    
    // Fallback UI in case redirection takes time or fails before throwing an error.
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="flex items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-lg text-muted-foreground">ページを準備しています...</span>
            </div>
        </div>
    );
}
