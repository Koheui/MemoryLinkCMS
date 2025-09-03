'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: null;
  loading: boolean;
  error: string | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  error: null,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // テスト用のログイン処理
      console.log('Login attempt for:', email);
      
      // モック認証処理（実際のFirebase認証の代わり）
      setTimeout(() => {
        const mockUser: User = {
          uid: `user-${Date.now()}`,
          email: email,
          displayName: email.split('@')[0],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setUser(mockUser);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Login error:', error);
      setError('ログインに失敗しました。');
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
  };

  useEffect(() => {
    // 初期状態ではユーザーをnullに設定（自動ログインしない）
    console.log('AuthProvider initialized - no auto login');
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser: null, loading, error, login, logout }}>
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
