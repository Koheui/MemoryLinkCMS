// src/hooks/use-auth.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';

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


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthContextType['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log("AuthProvider: Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log("onAuthStateChanged: Auth state changed. User:", authUser ? authUser.uid : 'null');
      if (authUser) {
        try {
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
