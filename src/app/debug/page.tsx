'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function DebugPage() {
  const [firebaseStatus, setFirebaseStatus] = useState<string>('チェック中...');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Firebase接続テスト
    if (auth) {
      setFirebaseStatus('Firebase Auth接続成功');
      console.log('Debug: Firebase Auth connected successfully');
      console.log('Debug: Auth config:', {
        apiKey: auth.config?.apiKey ? 'SET' : 'NOT SET',
        authDomain: auth.config?.authDomain
      });
    } else {
      setFirebaseStatus('Firebase Auth接続失敗');
      console.log('Debug: Firebase Auth connection failed');
    }
  }, []);

  const testLogin = async () => {
    if (!email || !password) return;
    
    setLoading(true);
    setTestResult('テスト中...');
    
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setTestResult(`ログイン成功: ${userCredential.user.email}`);
    } catch (error: any) {
      setTestResult(`ログイン失敗: ${error.code} - ${error.message}`);
      console.error('Debug: Login test error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Firebase接続デバッグ</CardTitle>
            <CardDescription>
              Firebase Authenticationの接続状態とログインテスト
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span>Firebase Auth状態:</span>
                {firebaseStatus.includes('成功') ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={firebaseStatus.includes('成功') ? 'text-green-600' : 'text-red-600'}>
                  {firebaseStatus}
                </span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="debug-email">テスト用メールアドレス</Label>
                <Input
                  id="debug-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="debug-password">テスト用パスワード</Label>
                <Input
                  id="debug-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="パスワード"
                />
              </div>
              
              <Button onClick={testLogin} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    テスト中...
                  </>
                ) : (
                  'ログインテスト'
                )}
              </Button>
              
              {testResult && (
                <div className="p-3 bg-gray-100 rounded-md">
                  <p className="text-sm">{testResult}</p>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>APIキー期限切れエラーの場合:</strong><br />
                  1. Firebase Consoleでプロジェクト設定を開く<br />
                  2. 「全般」タブで「Firebase SDK スニペット」を確認<br />
                  3. 新しいAPIキーを取得して設定を更新
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
