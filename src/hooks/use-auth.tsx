// src/hooks/use-auth.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, initializeFirebase } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import type { Order, Memory } from '@/lib/types';

// This configuration object will be populated by Next.js at build time.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase at the root of the application
initializeFirebase(firebaseConfig);

interface AuthContextType {
  user: (User & { uid: string }) | null;
  loading: boolean;
  isAdmin: boolean;
  handleLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    loading: true,
    isAdmin: false,
    handleLogout: async () => {},
});

// This function runs after a user signs in. It finds any orders/memories
// that were created for their email before they signed up, and it assigns
// those records to their new user UID.
const claimUnclaimedData = async (user: User) => {
    if (!user || !user.email) return;

    const batch = writeBatch(db);
    let claimedData = false;

    // 1. Find unclaimed orders by email
    const ordersQuery = query(
        collection(db, 'orders'),
        where('email', '==', user.email),
        where('userUid', '==', null)
    );
    const ordersSnapshot = await getDocs(ordersQuery);

    if (!ordersSnapshot.empty) {
        const memoryIdsToUpdate: string[] = [];
        ordersSnapshot.forEach(orderDoc => {
            console.log(`Claiming order ${orderDoc.id} for user ${user.uid}`);
            const orderRef = doc(db, 'orders', orderDoc.id);
            batch.update(orderRef, { userUid: user.uid });
            const memoryId = orderDoc.data().memoryId;
            if (memoryId) {
                memoryIdsToUpdate.push(memoryId);
            }
        });
        
        // 2. Find associated memories and claim them
        if (memoryIdsToUpdate.length > 0) {
            // Firestore 'in' queries are limited to 30 items.
            // For this app, it's highly unlikely a user will have more than 30 unclaimed pages.
            const memoriesQuery = query(
                collection(db, 'memories'),
                where('__name__', 'in', memoryIdsToUpdate)
            );
            const memoriesSnapshot = await getDocs(memoriesQuery);
            memoriesSnapshot.forEach(memoryDoc => {
                if(memoryDoc.data().ownerUid === null) {
                    console.log(`Claiming memory ${memoryDoc.id} for user ${user.uid}`);
                    const memoryRef = doc(db, 'memories', memoryDoc.id);
                    batch.update(memoryRef, { ownerUid: user.uid });
                }
            });
        }
        claimedData = true;
    }

    if (claimedData) {
        console.log("Committing claimed data batch...");
        await batch.commit();
        console.log("Batch committed successfully.");
    }
};


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthContextType['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      if (authUser) {
        try {
          // This is a new sign-in or state change, claim any data.
          await claimUnclaimedData(authUser);
          
          const tokenResult = await authUser.getIdTokenResult();
          const claims = tokenResult.claims;
          setIsAdmin(claims.role === 'admin');
          setUser(authUser as AuthContextType['user']);
        } catch (error) {
           console.error("Error during auth state processing:", error);
           await auth.signOut();
           setUser(null);
           setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await auth.signOut();
      // Use window.location.assign for a full page reload to ensure auth state is propagated correctly.
      window.location.assign('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
