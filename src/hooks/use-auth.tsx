
// src/hooks/use-auth.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: (User & { uid: string }) | null; // Make uid non-nullable on our custom user type
  loading: boolean;
  isAdmin: boolean;
  handleLogout: () => Promise<void>;
}

// A simple mock user object based on the verify API response
type VerifiedUser = {
  uid: string;
  email?: string;
  // Add other properties from User that you might need
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
  
  const verifyAndSetUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/verify');
      if (res.ok) {
        const data = await res.json();
        if (data.isAuthenticated) {
          // Reconstruct a user-like object from the verified data
          setUser({
            ...data,
            // Add mock methods that might be expected on a Firebase User object
            // to prevent runtime errors. These don't need to be functional.
            getIdToken: async () => 'mock-token',
            getIdTokenResult: async () => ({
              token: 'mock-token',
              claims: { role: data.isAdmin ? 'admin' : '' },
              // Add other required properties
              authTime: '',
              issuedAtTime: '',
              expirationTime: '',
              signInProvider: null,
              signInSecondFactor: null,
            }),
            reload: async () => {},
            toJSON: () => ({...data}),
          } as AuthContextType['user']);
          setIsAdmin(data.isAdmin);
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      }
    } catch (error) {
      console.error('Failed to verify session', error);
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyAndSetUser();
  }, [verifyAndSetUser]);
  
  const handleLogout = useCallback(async () => {
    setLoading(true);
    try {
      await auth.signOut();
      await fetch('/api/auth/sessionLogout', { method: 'POST' });
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
        console.error("Logout failed:", error);
    } finally {
        window.location.assign('/login');
    }
  }, []);

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
