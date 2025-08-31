'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // モックユーザーを設定
    console.log('Using mock authentication.');
    const mockUser: User = {
      uid: 'mock-user-id',
      email: 'dev@example.com',
      displayName: '開発ユーザー',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setUser(mockUser);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser: null, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
