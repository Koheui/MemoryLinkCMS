'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { User } from '@/types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentTenant } from '@/lib/security/tenant-validation';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  currentTenant: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  currentTenant: 'unknown',
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTenant, setCurrentTenant] = useState<string>('unknown');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // 現在のテナントを取得
          const tenant = getCurrentTenant();
          setCurrentTenant(tenant);
          
          // Firestoreからユーザー情報を取得
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            // 既存ユーザー
            const userData = userDocSnap.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: userData.displayName || firebaseUser.displayName || undefined,
              tenant: userData.tenant || tenant, // テナント情報を設定
              createdAt: userData.createdAt?.toDate() || new Date(firebaseUser.metadata.creationTime || Date.now()),
              updatedAt: userData.updatedAt?.toDate() || new Date(),
            });
          } else {
            // 新規ユーザー（初回ログイン）
            const userData: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || undefined,
              tenant: tenant, // テナント情報を設定
              createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
              updatedAt: new Date(),
            };
            
            // Firestoreにユーザー情報を保存
            await setDoc(userDocRef, {
              ...userData,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            
            setUser(userData);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // エラー時はFirebase Authの情報のみ使用
          const tenant = getCurrentTenant();
          setCurrentTenant(tenant);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || undefined,
            tenant: tenant,
            createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
            updatedAt: new Date(),
          });
        }
      } else {
        setUser(null);
        setCurrentTenant('unknown');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, currentTenant }}>
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
