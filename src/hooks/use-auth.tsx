// src/hooks/use-auth.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged, getAuth, Unsubscribe } from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase/client';
import { usePathname, useRouter } from 'next/navigation';


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
  const pathname = usePathname();

  useEffect(() => {
    let unsubscribeAuth: Unsubscribe | undefined;

    const initAuth = async () => {
        try {
            const app = await getFirebaseApp();
            const auth = getAuth(app);
            
            unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
              if (authUser) {
                try {
                  const tokenResult = await authUser.getIdTokenResult();
                  setIsAdmin(tokenResult.claims.role === 'admin');
                  setUser(authUser as AuthContextType['user']);
                } catch (error) {
                   console.error("Error getting token result:", error);
                   // If getting the token fails, it might be a temporary issue,
                   // but logging out is a safe fallback to force a clean state.
                   await handleLogout();
                }
              } else {
                setUser(null);
                setIsAdmin(false);
              }
              setLoading(false);
            });
        } catch(error) {
            console.error("Failed to initialize Firebase Auth listener", error);
            setLoading(false);
        }
    }

    initAuth();

    return () => {
        if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      const app = await getFirebaseApp();
      const auth = getAuth(app);
      await auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [router]);

  useEffect(() => {
    if (!loading) {
      const isAppPage = ![
        '/login',
        '/signup',
        '/'
      ].includes(pathname) && !pathname.startsWith('/p');

      if (user) {
        if (!isAppPage) {
          router.push('/dashboard');
        }
      } else {
        if (isAppPage) {
          router.push('/login');
        }
      }
    }
  }, [user, loading, pathname, router]);

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
