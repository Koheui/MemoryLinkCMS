// src/hooks/use-auth.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged, signOut, getIdToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const idTokenResult = await user.getIdTokenResult();
        apiClient.setToken(idTokenResult.token);
        setIsAdmin(!!idTokenResult.claims.role);
      } else {
        setUser(null);
        apiClient.setToken(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = useCallback(async (user: User) => {
    const idToken = await getIdToken(user);
    await apiClient.fetch('/api/auth/sessionLogin', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    // Use window.location.assign to force a page reload, 
    // ensuring the middleware can act on the new session cookie.
    window.location.assign('/dashboard');
  }, []);

  const handleLogout = useCallback(async () => {
    await apiClient.fetch('/api/auth/sessionLogout', { method: 'POST' });
    await signOut(auth);
    // Use window.location.assign to ensure a clean state after logout.
    window.location.assign('/login');
  }, []);


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
