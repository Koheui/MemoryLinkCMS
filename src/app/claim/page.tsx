'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, AlertCircle, Mail, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function ClaimPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    // URLパラメータから情報を取得
    const emailParam = searchParams.get('email');
    const mode = searchParams.get('mode');
    const claimKey = searchParams.get('key');

    if (emailParam) {
      setEmail(emailParam);
    }

    if (mode === 'login') {
      setIsLoginMode(true);
    }

    // クレームキーがある場合は直接処理
    if (claimKey) {
      handleClaimWithKey(claimKey);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const handleClaimWithKey = async (key: string) => {
    // モッククレーム処理
    setTimeout(() => {
      setSuccess(true);
      setTimeout(() => {
        // クレームキーに基づいてメモリを作成し、編集画面に移動
        const memoryId = `memory-${Date.now()}`;
        router.push(`/memories/${memoryId}?claimKey=${key}`);
      }, 2000);
    }, 1000);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    
    try {
      // AuthProviderのlogin関数を使用
      await login(email);
      setSuccess(true);
      setTimeout(() => {
        // 認証成功後、ダッシュボードに移動
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Login error:', error);
      setError('ログインに失敗しました。メールアドレスを確認してください。');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>処理中...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <span>エラー</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/')}>
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              <span>成功</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              {isLoginMode ? 'ログインが完了しました。' : '想い出ページの作成を開始します。'}
            </p>
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>リダイレクト中...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ログインモードの表示
  if (isLoginMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Heart className="w-8 h-8 text-red-500" />
              <span className="text-xl font-bold">想い出リンク</span>
            </div>
            <CardTitle>ログイン</CardTitle>
            <CardDescription>
              メールアドレスを入力してログインしてください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'ログイン中...' : 'ログイン'}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Button variant="link" onClick={() => router.push('/')}>
                新規登録はこちら
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // デフォルト表示（クレームキーなし）
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Heart className="w-8 h-8 text-red-500" />
            <span className="text-xl font-bold">想い出リンク</span>
          </div>
          <CardTitle>想い出ページにアクセス</CardTitle>
          <CardDescription>
            クレームキーまたはメールアドレスを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={() => router.push('/dashboard')} 
              className="w-full"
            >
              ダッシュボードに移動
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsLoginMode(true)} 
              className="w-full"
            >
              ログイン
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
