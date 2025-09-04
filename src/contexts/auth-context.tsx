'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword, signOut, Auth } from 'firebase/auth';
import { doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
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
    console.log('AuthProvider: Attempting login with:', email);

    if (!auth) {
      setError('Firebase Authが初期化されていません。');
      setLoading(false);
      return;
    }

    // モック認証の場合は直接成功
    if (auth.type === 'mock' || !auth.signInWithEmailAndPassword) {
      console.log('AuthProvider: Using mock authentication');
      const mockUser = {
        uid: 'mock-user-id',
        email: email,
        displayName: 'Mock User',
        metadata: { creationTime: Date.now().toString() }
      };
      
      setUser({
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.displayName,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setFirebaseUser(mockUser as any);
      setLoading(false);
      return;
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('AuthProvider: Login successful for:', result.user.email);
      
      // Firestoreからユーザー情報を取得または作成
      if (db) {
        const userDocRef = doc(db, 'users', result.user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUser({
            uid: result.user.uid,
            email: result.user.email || '',
            displayName: userData.displayName || result.user.displayName || undefined,
            createdAt: userData.createdAt?.toDate() || new Date(result.user.metadata.creationTime || Date.now()),
            updatedAt: userData.updatedAt?.toDate() || new Date(),
          });
        } else {
          const newUserData: User = {
            uid: result.user.uid,
            email: result.user.email || '',
            displayName: result.user.displayName || undefined,
            createdAt: new Date(result.user.metadata.creationTime || Date.now()),
            updatedAt: new Date(),
          };
          await setDoc(userDocRef, newUserData);
          setUser(newUserData);
        }
      } else {
        // Firestoreが利用できない場合、Firebase Authの情報のみ使用
        setUser({
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || undefined,
          createdAt: new Date(result.user.metadata.creationTime || Date.now()),
          updatedAt: new Date(),
        });
      }
      setLoading(false);
    } catch (err: any) {
      console.error('AuthProvider: Login error:', err);
      let errorMessage = 'ログインに失敗しました。';
      switch (err.code) {
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
        case 'auth/api-key-expired.-please-renew-the-api-key':
          errorMessage = 'APIキーが期限切れです。Firebase ConsoleでAPIキーを更新してください。';
          break;
        case 'auth/invalid-api-key':
          errorMessage = '無効なAPIキーです。Firebase Consoleで設定を確認してください。';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
          break;
        default:
          errorMessage = `ログインに失敗しました。エラーコード: ${err.code}`;
      }
      setError(errorMessage);
      setLoading(false);
      throw err; // Re-throw to be caught by the calling component
    }
  };

  const logout = async () => {
    if (!auth) {
      setError('Firebase Authが初期化されていません。');
      return;
    }
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
      setError(null);
      console.log('AuthProvider: User logged out');
    } catch (err: any) {
      console.error('AuthProvider: Logout error:', err);
      setError('ログアウトに失敗しました。');
    }
  };

  useEffect(() => {
    if (!auth) {
      setError('Firebase Authが初期化されていません。環境変数を確認してください。');
      setLoading(false);
      return;
    }

    console.log('AuthProvider: Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      console.log('AuthProvider: Auth state changed:', fbUser ? 'User logged in' : 'User logged out');

      if (fbUser) {
        try {
          if (!db) {
            throw new Error('Firestore接続が利用できません');
          }
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUser({
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: userData.displayName || fbUser.displayName || undefined,
              createdAt: userData.createdAt?.toDate() || new Date(fbUser.metadata.creationTime || Date.now()),
              updatedAt: userData.updatedAt?.toDate() || new Date(),
            });
          } else {
            const newUserData: User = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || undefined,
              createdAt: new Date(fbUser.metadata.creationTime || Date.now()),
              updatedAt: new Date(),
            };
            await setDoc(userDocRef, newUserData);
            setUser(newUserData);
          }
          setError(null);
          console.log('AuthProvider: Setting user state:', user);
        } catch (err: any) {
          console.error('AuthProvider: Error fetching user data:', err);
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || undefined,
            createdAt: new Date(fbUser.metadata.creationTime || Date.now()),
            updatedAt: new Date(),
          });
          setError(`Firestore接続エラー: ユーザー情報の取得に失敗しました (${err.message})`);
        }
      } else {
        setUser(null);
        setError(null);
        console.log('AuthProvider: Clearing user state');
      }
      setLoading(false);
    }, (err) => {
      console.error('AuthProvider: Auth state listener error:', err);
      setError(`認証状態リスナーエラー: ${err.message}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]); // Dependencies for useEffect

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
