
'use server';

import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionCookie = (await cookies().get('__session'))?.value || '';

  if (!sessionCookie) {
    notFound();
  }

  try {
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie, true);
    if (decodedClaims.role !== 'admin') {
      notFound();
    }
  } catch (error) {
    console.error('Session cookie verification failed:', error);
    notFound();
  }

  return <>{children}</>;
}
