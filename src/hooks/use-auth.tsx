
// src/hooks/use-auth.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import type { Order, Memory } from '@/lib/types';

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
    if (!user || !user.email) {
        console.log("claimUnclaimedData: No user or email, skipping.");
        return;
    }

    console.log(`claimUnclaimedData: Starting process for user ${user.uid} with email ${user.email}`);
    const batch = writeBatch(db);
    let claimedData = false;

    try {
        // 1. Find unclaimed orders by email
        console.log(`claimUnclaimedData: Querying orders where email is ${user.email} and userUid is null.`);
        const ordersQuery = query(
            collection(db, 'orders'),
            where('email', '==', user.email),
            where('userUid', '==', null)
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        console.log(`claimUnclaimedData: Found ${ordersSnapshot.size} unclaimed orders.`);

        if (!ordersSnapshot.empty) {
            const memoryIdsToUpdate: string[] = [];
            ordersSnapshot.forEach(orderDoc => {
                console.log(`claimUnclaimedData: Claiming order ${orderDoc.id} for user ${user.uid}`);
                const orderRef = doc(db, 'orders', orderDoc.id);
                batch.update(orderRef, { userUid: user.uid });
                const memoryId = orderDoc.data().memoryId;
                if (memoryId) {
                    memoryIdsToUpdate.push(memoryId);
                }
            });
            
            // 2. Find associated memories and claim them
            if (memoryIdsToUpdate.length > 0) {
                console.log(`claimUnclaimedData: Found memory IDs to update:`, memoryIdsToUpdate);
                // Firestore 'in' queries are limited to 30 items.
                const memoriesQuery = query(
                    collection(db, 'memories'),
                    where('__name__', 'in', memoryIdsToUpdate)
                );
                const memoriesSnapshot = await getDocs(memoriesQuery);
                console.log(`claimUnclaimedData: Found ${memoriesSnapshot.size} associated memories to claim.`);
                memoriesSnapshot.forEach(memoryDoc => {
                    if(memoryDoc.data().ownerUid === null) {
                        console.log(`claimUnclaimedData: Claiming memory ${memoryDoc.id} for user ${user.uid}`);
                        const memoryRef = doc(db, 'memories', memoryDoc.id);
                        batch.update(memoryRef, { ownerUid: user.uid });
                    } else {
                        console.log(`claimUnclaimedData: Memory ${memoryDoc.id} already has an owner.`);
                    }
                });
            }
            claimedData = true;
        }

        if (claimedData) {
            console.log("claimUnclaimedData: Committing claimed data batch...");
            await batch.commit();
            console.log("claimUnclaimedData: Batch committed successfully.");
        } else {
            console.log("claimUnclaimedData: No data to claim.");
        }
    } catch (error) {
        console.error("claimUnclaimedData: Error during data claiming process.", error);
        // We throw the error so the calling function can handle it.
        throw error;
    }
};


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthContextType['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log("AuthProvider: useEffect triggered, setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log("onAuthStateChanged: Auth state changed. User:", authUser ? authUser.uid : 'null');
      setLoading(true);
      if (authUser) {
        try {
          console.log(`onAuthStateChanged: User is authenticated (${authUser.uid}). Attempting to claim data.`);
          await claimUnclaimedData(authUser);
          
          console.log(`onAuthStateChanged: Getting ID token result for user ${authUser.uid}.`);
          const tokenResult = await authUser.getIdTokenResult();
          const claims = tokenResult.claims;
          console.log("onAuthStateChanged: User claims:", claims);
          
          setIsAdmin(claims.role === 'admin');
          setUser(authUser as AuthContextType['user']);
          console.log("onAuthStateChanged: Successfully set user and admin state.");
        } catch (error) {
           console.error("Error during auth state processing:", error);
           await auth.signOut();
           setUser(null);
           setIsAdmin(false);
           console.log("onAuthStateChanged: Signed out user due to error.");
        }
      } else {
        console.log("onAuthStateChanged: User is not authenticated.");
        setUser(null);
        setIsAdmin(false);
      }
      console.log("onAuthStateChanged: Finished processing. Setting loading to false.");
      setLoading(false);
    });

    return () => {
        console.log("AuthProvider: Cleanup useEffect. Unsubscribing from onAuthStateChanged.");
        unsubscribe();
    };
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await auth.signOut();
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
