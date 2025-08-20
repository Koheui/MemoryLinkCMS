// src/hooks/use-auth.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

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
      if (authUser) {
        // User is signed in.
        const tokenResult = await authUser.getIdTokenResult();
        const claims = tokenResult.claims;
        setIsAdmin(claims.role === 'admin');
        setUser(authUser as AuthContextType['user']);
        
        // Save id token to cookie for server components
        const idToken = await authUser.getIdToken();
        Cookies.set('idToken', idToken, { expires: 1, secure: process.env.NODE_ENV === 'production' });

      } else {
        // User is signed out.
        setUser(null);
        setIsAdmin(false);
        Cookies.remove('idToken');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await auth.signOut();
      // onAuthStateChanged will handle cookie removal and state change
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
