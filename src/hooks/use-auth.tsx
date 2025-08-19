// src/hooks/use-auth.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { apiClient } from '@/lib/api-client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  handleAuthSuccess: (user: User) => Promise<void>;
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const idTokenResult = await user.getIdTokenResult();
        setIsAdmin(idTokenResult.claims.role === 'admin');
        apiClient.setToken(await user.getIdToken());
        Cookies.set('isLoggedIn', 'true', { path: '/' });
      } else {
        setUser(null);
        setIsAdmin(false);
        apiClient.setToken(null);
        Cookies.remove('isLoggedIn', { path: '/' });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = useCallback(async (user: User) => {
    const token = await user.getIdToken();
    apiClient.setToken(token);
    Cookies.set('isLoggedIn', 'true', { path: '/' });
    
    // Check if it's a new user by creation time
    const metadata = user.metadata;
    if (metadata.creationTime === metadata.lastSignInTime) {
      router.push('/memories/new');
    } else {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogout = useCallback(async () => {
    await auth.signOut();
    apiClient.setToken(null);
    Cookies.remove('isLoggedIn', { path: '/' });
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
