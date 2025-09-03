'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertCircle, Heart, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

function ClaimPageContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loading: authLoading, error: authError } = useAuth();

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
    if (!email || !password) return;

    try {
      console.log('Claim page: Attempting login with:', email);
      await login(email, password);
      console.log('Claim page: Login successful, setting success state');
      setSuccess(true);
      setTimeout(() => {
        console.log('Claim page: Redirecting to dashboard');
        // 認証成功後、ダッシュボードに移動
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Claim page: Login error:', error);
      // エラーはAuthProviderで処理される
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
              メールアドレスとパスワードを入力してログインしてください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="パスワードを入力"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{authError}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ログイン中...
                  </>
                ) : (
                  'ログイン'
                )}
              </Button>
            </form>
            
            <div className="mt-4 text-center space-y-2">
              <Button variant="link" onClick={() => router.push('/')}>
                新規登録はこちら
              </Button>
              <div className="text-sm text-gray-500">
                パスワードを忘れた方は
                <Button variant="link" className="p-0 h-auto text-sm">
                  こちら
                </Button>
              </div>
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

export default function ClaimPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>読み込み中...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <ClaimPageContent />
    </Suspense>
  );
}
