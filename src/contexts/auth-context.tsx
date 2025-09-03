'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('AuthProvider: Attempting login with:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log('AuthProvider: Login successful for:', firebaseUser.email);
      
      // FirebaseUserをUser型に変換
      const user: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
        createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
        updatedAt: new Date(),
      };
      
      console.log('AuthProvider: Setting user state:', user);
      setUser(user);
      setFirebaseUser(firebaseUser);
      setLoading(false);
    } catch (error: any) {
      console.error('AuthProvider: Login error:', error);
      let errorMessage = 'ログインに失敗しました。';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'ユーザーが見つかりません。';
          break;
        case 'auth/wrong-password':
          errorMessage = 'パスワードが正しくありません。';
          break;
        case 'auth/invalid-email':
          errorMessage = 'メールアドレスの形式が正しくありません。';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'ログイン試行回数が多すぎます。しばらく待ってから再試行してください。';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
          break;
        case 'auth/invalid-api-key':
          errorMessage = 'Firebase設定エラーが発生しました。';
          break;
        default:
          errorMessage = `ログインに失敗しました。エラーコード: ${error.code}`;
      }
      
      setError(errorMessage);
      setLoading(false);
      throw error; // エラーを再スローして呼び出し元でキャッチ
    }
  };

  const logout = async () => {
    try {
      console.log('AuthProvider: Attempting logout');
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
      setError(null);
      console.log('AuthProvider: Logout successful');
    } catch (error) {
      console.error('AuthProvider: Logout error:', error);
      setError('ログアウトに失敗しました。');
    }
  };

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('AuthProvider: Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');
      if (firebaseUser) {
        // FirebaseUserをUser型に変換
        const user: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
          createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
          updatedAt: new Date(),
        };
        console.log('AuthProvider: Setting user from auth state:', user);
        setUser(user);
        setFirebaseUser(firebaseUser);
      } else {
        console.log('AuthProvider: Clearing user from auth state');
        setUser(null);
        setFirebaseUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, error, login, logout }}>
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
