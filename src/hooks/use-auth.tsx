// src/hooks/use-auth.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, onIdTokenChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  handleAuthSuccess: (idToken: string) => Promise<void>;
  handleLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    loading: true,
    isAdmin: false,
    handleAuthSuccess: async () => {},
    handleLogout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const idTokenResult = await user.getIdTokenResult();
        setIsAdmin(!!idTokenResult.claims.role);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = useCallback(async (idToken: string) => {
    const response = await fetch('/api/auth/sessionLogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (response.ok) {
        const user = auth.currentUser;
        if (user && user.metadata.creationTime === user.metadata.lastSignInTime) {
          router.push('/memories/new');
        } else {
          router.push('/dashboard');
        }
    } else {
        console.error('Session login failed');
    }
  }, [router]);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/sessionLogout', { method: 'POST' });
    await signOut(auth);
    router.push('/login');
  }, [router]);


  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, handleAuthSuccess, handleLogout }}>
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
