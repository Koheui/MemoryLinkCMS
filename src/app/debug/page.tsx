'use client';

import { useEffect, useState } from 'react';
import { auth, db, storage } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function DebugPage() {
  const [firebaseStatus, setFirebaseStatus] = useState('Checking...');
  const [authStatus, setAuthStatus] = useState('Checking...');
  const [firestoreStatus, setFirestoreStatus] = useState('Checking...');
  const [storageStatus, setStorageStatus] = useState('Checking...');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginResult, setLoginResult] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { login, logout, user, loading, error: authError } = useAuth();

  useEffect(() => {
    // Firebase App initialization status
    if (auth && db && storage) {
      setFirebaseStatus('Firebase App initialized successfully.');
    } else {
      setFirebaseStatus('Firebase App initialization failed or incomplete.');
    }

    // Auth status
    if (auth) {
      if (auth.type === 'mock') {
        setAuthStatus('Firebase Auth: Mock mode (API key expired)');
      } else {
        setAuthStatus(`Firebase Auth: Initialized. API Key: ${auth.app?.options?.apiKey ? 'SET' : 'NOT SET'}`);
      }
    } else {
      setAuthStatus('Firebase Auth: Not initialized.');
    }

    // Firestore status
    if (db) {
      if (db.type === 'mock') {
        setFirestoreStatus('Firestore: Mock mode');
      } else {
        setFirestoreStatus('Firestore: Initialized.');
      }
    } else {
      setFirestoreStatus('Firestore: Not initialized.');
    }

    // Storage status
    if (storage) {
      if (storage.type === 'mock') {
        setStorageStatus('Firebase Storage: Mock mode');
      } else {
        setStorageStatus('Firebase Storage: Initialized.');
      }
    } else {
      setStorageStatus('Firebase Storage: Not initialized.');
    }
  }, [auth, db, storage]);

  const handleLoginTest = async () => {
    setLoginResult('Logging in...');
    try {
      await login(loginEmail, loginPassword);
      setLoginResult('Login successful!');
    } catch (err: any) {
      setLoginResult(`Login failed: ${err.message || err.code}`);
    }
  };

  const handleLogoutTest = async () => {
    setLoginResult('Logging out...');
    try {
      await logout();
      setLoginResult('Logout successful!');
    } catch (err: any) {
      setLoginResult(`Logout failed: ${err.message || err.code}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Firebase Debug Page</h1>

        <Card>
          <CardHeader>
            <CardTitle>Firebase Connection Status</CardTitle>
            <CardDescription>
              現在のFirebaseサービスの接続状態と設定を確認します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Firebase App:</strong> {firebaseStatus}</p>
            <p><strong>Auth:</strong> {authStatus}</p>
            <p><strong>Firestore:</strong> {firestoreStatus}</p>
            <p><strong>Storage:</strong> {storageStatus}</p>
            {authError && (
              <div className="p-3 bg-red-100 border border-red-200 rounded-md text-red-800">
                <p className="font-medium">Auth Context Error:</p>
                <p className="text-sm">{authError}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Firebase Authentication Test</CardTitle>
            <CardDescription>
              Firebase Authで直接ログイン・ログアウトをテストします。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="debug-email">メールアドレス</Label>
              <Input
                id="debug-email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <Label htmlFor="debug-password">パスワード</Label>
              <div className="relative">
                <Input
                  id="debug-password"
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="パスワード"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-1"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleLoginTest} disabled={loading || !loginEmail || !loginPassword}>
                ログインテスト
              </Button>
              <Button variant="outline" onClick={handleLogoutTest} disabled={loading || !user}>
                ログアウトテスト
              </Button>
            </div>
            {loginResult && (
              <div className={`p-3 rounded-md ${loginResult.includes('successful') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <p className="font-medium">結果:</p>
                <p className="text-sm">{loginResult}</p>
              </div>
            )}
            {user && (
              <div className="p-3 bg-blue-100 text-blue-800 rounded-md">
                <p className="font-medium">ログイン中のユーザー:</p>
                <p className="text-sm">UID: {user.uid}</p>
                <p className="text-sm">Email: {user.email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>APIキーの更新手順</CardTitle>
            <CardDescription>
              APIキーが期限切れまたは無効な場合は、以下の手順で更新してください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>1. <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Firebase Console</a>にアクセスし、プロジェクトを選択します。</p>
            <p>2. 左側のメニューから「⚙️ プロジェクト設定」をクリックします。</p>
            <p>3. 「全般」タブの「マイアプリ」セクションでWebアプリの設定を確認します。</p>
            <p>4. 「Firebase SDK スニペット」セクションの「設定」をクリックして、新しい設定を取得します。</p>
            <p>5. 取得した新しい<code>apiKey</code>を<code>src/lib/firebase.ts</code>ファイルに更新します。</p>
            <p>6. <code>isApiKeyExpired</code>を<code>false</code>に変更します。</p>
            <p>7. 変更をコミットしてデプロイします。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
