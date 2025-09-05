'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentTenant } from '@/lib/security/tenant-validation';
import { isAdminSecretKey } from '@/lib/secret-key-utils';

interface SecretKeyAuthContextType {
  user: User | null;
  currentUser: User | null; // 互換性のため
  loading: boolean;
  currentTenant: string;
  isAuthenticated: boolean;
  authenticateWithSecretKey: (secretKey: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const SecretKeyAuthContext = createContext<SecretKeyAuthContextType>({
  user: null,
  currentUser: null,
  loading: true,
  currentTenant: 'unknown',
  isAuthenticated: false,
  authenticateWithSecretKey: async () => ({ success: false }),
  logout: () => {},
});

export function SecretKeyAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTenant, setCurrentTenant] = useState<string>('unknown');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // セッションから認証状態を復元
  useEffect(() => {
    // まずlocalStorageをチェック（より永続的）
    const persistentUser = localStorage.getItem('secretKeyUser');
    const persistentTenant = localStorage.getItem('secretKeyTenant');
    const persistentExpiry = localStorage.getItem('secretKeyExpiry');
    
    // 次にsessionStorageをチェック（セッション中）
    const sessionUser = sessionStorage.getItem('secretKeyUser');
    const sessionTenant = sessionStorage.getItem('secretKeyTenant');
    const sessionExpiry = sessionStorage.getItem('secretKeyExpiry');
    
    const savedUser = persistentUser || sessionUser;
    const savedTenant = persistentTenant || sessionTenant;
    const savedExpiry = persistentExpiry || sessionExpiry;
    
    if (savedUser && savedTenant && savedExpiry) {
      try {
        const expiryTime = parseInt(savedExpiry);
        const now = Date.now();
        
        // 有効期限をチェック（24時間）
        if (now < expiryTime) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setCurrentTenant(savedTenant);
          setIsAuthenticated(true);
          console.log('Authentication state restored from storage');
        } else {
          console.log('Authentication expired, clearing storage');
          localStorage.removeItem('secretKeyUser');
          localStorage.removeItem('secretKeyTenant');
          localStorage.removeItem('secretKeyExpiry');
          sessionStorage.removeItem('secretKeyUser');
          sessionStorage.removeItem('secretKeyTenant');
          sessionStorage.removeItem('secretKeyExpiry');
        }
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('secretKeyUser');
        localStorage.removeItem('secretKeyTenant');
        localStorage.removeItem('secretKeyExpiry');
        sessionStorage.removeItem('secretKeyUser');
        sessionStorage.removeItem('secretKeyTenant');
        sessionStorage.removeItem('secretKeyExpiry');
      }
    }
    
    setLoading(false);
  }, []);

  const authenticateWithSecretKey = async (secretKey: string) => {
    try {
      setLoading(true);
      
      // 管理者用秘密鍵のチェック（開発用）
      if (isAdminSecretKey(secretKey)) {
        const adminUserData: User = {
          uid: 'admin-dev',
          email: 'admin@emolink.dev',
          displayName: '開発管理者',
          tenant: 'futurestudio',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // セッションに保存
        sessionStorage.setItem('secretKeyUser', JSON.stringify(adminUserData));
        sessionStorage.setItem('secretKeyTenant', 'futurestudio');
        sessionStorage.setItem('secretKeyExpiry', (Date.now() + 24 * 60 * 60 * 1000).toString());
        
        // localStorageにも保存（より永続的）
        localStorage.setItem('secretKeyUser', JSON.stringify(adminUserData));
        localStorage.setItem('secretKeyTenant', 'futurestudio');
        localStorage.setItem('secretKeyExpiry', (Date.now() + 24 * 60 * 60 * 1000).toString());
        
        setUser(adminUserData);
        setCurrentTenant('futurestudio');
        setIsAuthenticated(true);
        
        return { success: true };
      }
      
      // 通常の秘密鍵の有効性チェック
      const secretKeyDoc = await getDoc(doc(db, 'secretKeys', secretKey));
      
      if (!secretKeyDoc.exists()) {
        return { success: false, error: '無効な秘密鍵です' };
      }
      
      const secretKeyData = secretKeyDoc.data();
      
      if (secretKeyData.status !== 'active') {
        return { success: false, error: 'この秘密鍵は使用済みです' };
      }
      
      if (new Date() > secretKeyData.expiresAt.toDate()) {
        return { success: false, error: 'この秘密鍵は期限切れです' };
      }
      
      // 認証成功 - ユーザー情報を作成
      const userData: User = {
        uid: `secret-${Date.now()}`, // 一時的なUID
        email: secretKeyData.email,
        displayName: secretKeyData.email.split('@')[0],
        tenant: secretKeyData.tenant,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // セッションに保存
      sessionStorage.setItem('secretKeyUser', JSON.stringify(userData));
      sessionStorage.setItem('secretKeyTenant', secretKeyData.tenant);
      sessionStorage.setItem('secretKeyExpiry', (Date.now() + 24 * 60 * 60 * 1000).toString());
      
      // localStorageにも保存（より永続的）
      localStorage.setItem('secretKeyUser', JSON.stringify(userData));
      localStorage.setItem('secretKeyTenant', secretKeyData.tenant);
      localStorage.setItem('secretKeyExpiry', (Date.now() + 24 * 60 * 60 * 1000).toString());
      
      setUser(userData);
      setCurrentTenant(secretKeyData.tenant);
      setIsAuthenticated(true);
      
      // 秘密鍵を無効化
      await updateDoc(doc(db, 'secretKeys', secretKey), {
        status: 'used',
        usedAt: new Date(),
        usedBy: userData.email
      });
      
      return { success: true };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: '認証中にエラーが発生しました' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('secretKeyUser');
    sessionStorage.removeItem('secretKeyTenant');
    sessionStorage.removeItem('secretKeyExpiry');
    localStorage.removeItem('secretKeyUser');
    localStorage.removeItem('secretKeyTenant');
    localStorage.removeItem('secretKeyExpiry');
    setUser(null);
    setCurrentTenant('unknown');
    setIsAuthenticated(false);
  };

  return (
    <SecretKeyAuthContext.Provider value={{
      user,
      currentUser: user, // 互換性のため
      loading,
      currentTenant,
      isAuthenticated,
      authenticateWithSecretKey,
      logout,
    }}>
      {children}
    </SecretKeyAuthContext.Provider>
  );
}

export function useSecretKeyAuth() {
  const context = useContext(SecretKeyAuthContext);
  if (!context) {
    throw new Error('useSecretKeyAuth must be used within a SecretKeyAuthProvider');
  }
  return context;
}
