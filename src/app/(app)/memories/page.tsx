
// src/app/(app)/memories/page.tsx
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';

export default async function MemoriesRedirectPage() {
  const sessionCookie = cookies().get('__session')?.value;
  if (!sessionCookie) {
    redirect('/login');
  }

  let uid: string;
  try {
    const app = getAdminApp();
    const decodedClaims = await app.auth().verifySessionCookie(sessionCookie, true);
    uid = decodedClaims.uid;
  } catch (error) {
    console.error('Session verification failed, redirecting to login', error);
    redirect('/login');
  }

  try {
    const db = getFirestore(getAdminApp());
    const memoriesSnapshot = await db.collection('memories').where('ownerUid', '==', uid).limit(1).get();
    
    if (memoriesSnapshot.empty) {
      // This case should ideally not happen for a logged-in user,
      // but as a fallback, redirect to a page where they can create one.
      // For now, redirecting to dashboard.
      console.error(`No memory found for user ${uid}, redirecting to dashboard.`);
      redirect('/dashboard');
    }

    const memoryId = memoriesSnapshot.docs[0].id;
    redirect(`/memories/${memoryId}`);
    
  } catch (error) {
    console.error(`Failed to fetch memory for user ${uid}, redirecting to dashboard.`, error);
    redirect('/dashboard');
  }
}
