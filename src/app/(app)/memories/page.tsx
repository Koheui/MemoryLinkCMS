// src/app/(app)/memories/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase-admin/firestore';
import { Loader2 } from 'lucide-react';

// This is a server component that handles the redirection logic
// after a user lands on the generic /memories route.

export default async function MemoriesRedirectPage() {
    const sessionCookie = cookies().get('__session')?.value;

    if (!sessionCookie) {
        // No session, redirect to login
        redirect('/login');
    }

    try {
        // Initialize admin app to verify session and talk to Firestore
        const adminApp = getAdminApp();
        const auth = getAuth(adminApp);
        const db = getFirestore(adminApp);

        // Verify the session cookie
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        const uid = decodedClaims.uid;
        
        // Find the user's first memory page
        const memoriesQuery = query(
            collection(db, 'memories'), 
            where('ownerUid', '==', uid), 
            limit(1)
        );
        const querySnapshot = await getDocs(memoriesQuery);
        
        if (!querySnapshot.empty) {
            const memoryId = querySnapshot.docs[0].id;
            // Redirect to the specific memory editor page
            redirect(`/memories/${memoryId}`);
        } else {
            // This case might happen if memory creation failed during signup
            // Or if the user has no memories. Redirect to account page as a safe fallback.
             console.warn(`No memory found for user ${uid}, redirecting to /account`);
            redirect('/account');
        }

    } catch (error) {
        // Cookie is invalid, expired, or something else went wrong
        console.error('Redirection error in /memories page:', error);
        // Redirect to login if session verification fails
        redirect('/login');
    }
    
    // This part should ideally not be reached due to redirects,
    // but it's good practice to have a fallback UI.
    return (
       <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">ページを読み込んでいます...</span>
        </div>
      </div>
    );
}
