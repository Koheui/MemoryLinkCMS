// src/hooks/use-auth.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onIdTokenChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (!user) {
        // Optional: If you want to forcefully redirect from any page if user logs out.
        // Be careful with this on public pages. For an app behind a login wall, this is safer.
        // Consider the page path before redirecting.
        // router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};