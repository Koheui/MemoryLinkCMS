// src/hooks/use-auth.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // This listener is for client-side state, but we trust the server session primarily.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        if(!user) {
            // If firebase listener says no user, ensure we clear server session status
            setIsAdmin(false);
        }
    });

    // Verify server-side session on initial load
    fetch('/api/auth/verify').then(res => res.json()).then(data => {
        if(data.isAuthenticated){
            if(!auth.currentUser) {
                // This can happen on first load. The onAuthStateChanged listener will catch up.
            }
            setIsAdmin(data.isAdmin);
        } else {
            setUser(null);
            setIsAdmin(false);
        }
        setLoading(false);
    }).catch(() => {
        // If API fails, assume not authenticated
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const handleLogout = useCallback(async () => {
    try {
      // Clear client-side auth state
      await auth.signOut();
      // Clear server-side session
      await fetch('/api/auth/sessionLogout', { method: 'POST' });
    } catch (error) {
        console.error("Logout failed:", error);
    } finally {
        // Redirect to login page
        router.push('/login');
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
