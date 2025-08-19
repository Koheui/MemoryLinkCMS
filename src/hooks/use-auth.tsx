// src/hooks/use-auth.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Do nothing while loading
    if (loading) {
      return;
    }

    const isAuthPage = pathname === '/login' || pathname === '/signup';
    
    // If there's no user, redirect to login page if not already there or on a public page
    const isProtectedRoute = !isAuthPage && pathname !== '/' && !pathname.startsWith('/p/');
    
    if (!user && isProtectedRoute) {
      router.push('/login');
    }

    // If there is a user, redirect from auth pages to the dashboard
    if (user && isAuthPage) {
      router.push('/dashboard');
    }

  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};