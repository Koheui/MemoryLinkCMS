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
      // The state change from onAuthStateChanged will trigger the layout effect
      // to redirect to the login page. We can also push manually for faster feedback.
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
