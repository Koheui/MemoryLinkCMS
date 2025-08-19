
'use server';

import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

// Initialize Firebase Admin SDK
getAdminApp();

// This layout is now explicitly protected by a server-side check.
// The middleware only ensures a session cookie exists, but this layout
// ensures the user is an admin.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionCookie = cookies().get('__session')?.value;
  if (!sessionCookie) {
    // This should theoretically be caught by middleware, but as a safeguard:
    notFound();
  }

  try {
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie, true);
    if (decodedClaims.role !== 'admin') {
      // If the user is not an admin, treat it as a not found page.
      notFound();
    }
  } catch (error) {
    // If the cookie is invalid, also treat as not found.
    console.error("Admin layout session verification failed:", error);
    notFound();
  }

  return <>{children}</>;
}
