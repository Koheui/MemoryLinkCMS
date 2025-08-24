// src/hooks/use-auth.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
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


// Function to check for and claim an invited page
const claimInvitedPage = async (user: User) => {
    if (!user.email) return;

    // Find an order with the user's email that hasn't been claimed yet
    const ordersQuery = query(
        collection(db, 'orders'),
        where('email', '==', user.email),
        where('userUid', '==', null)
    );

    const querySnapshot = await getDocs(ordersQuery);

    if (!querySnapshot.empty) {
        // Claim the first found invitation
        const orderDoc = querySnapshot.docs[0];
        const order = orderDoc.data() as Order;
        
        if (order.memoryId) {
            console.log(`User ${user.email} has a pending invitation for memory ${order.memoryId}. Claiming it now.`);
            
            const batch = writeBatch(db);

            // 1. Assign the memory to the user
            const memoryRef = doc(db, 'memories', order.memoryId);
            batch.update(memoryRef, { ownerUid: user.uid });

            // 2. Mark the order as claimed by this user
            batch.update(orderDoc.ref, { userUid: user.uid });

            try {
                await batch.commit();
                console.log(`Successfully claimed page ${order.memoryId} for user ${user.uid}.`);
                // Returning true to indicate a claim was made, which might trigger a UI refresh
                return true;
            } catch (error) {
                console.error("Error claiming page:", error);
                return false;
            }
        }
    }
    return false;
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthContextType['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      if (authUser) {
        try {
          // Check for page invitation claim right after auth state is confirmed
          await claimInvitedPage(authUser);

          const tokenResult = await authUser.getIdTokenResult();
          const claims = tokenResult.claims;
          setIsAdmin(claims.role === 'admin');
          setUser(authUser as AuthContextType['user']);
          apiClient.setToken(tokenResult.token);
        } catch (error) {
           console.error("Error getting user token:", error);
           await auth.signOut();
           setUser(null);
           setIsAdmin(false);
           apiClient.setToken(null);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        apiClient.setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await auth.signOut();
      apiClient.setToken(null);
      router.push('/login');
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
