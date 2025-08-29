// src/app/claim/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getFirebaseApp } from '@/lib/firebase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Memory } from '@/lib/types';

interface ClaimToken {
  requestId: string;
  email: string;
  tenant: string;
  lpId: string;
  productType: string;
  exp: number;
}

export default function ClaimPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [claimStatus, setClaimStatus] = useState<'verifying' | 'success' | 'error' | 'expired' | 'already-claimed' | 'email-mismatch'>('verifying');
  const [claimData, setClaimData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('k');
    if (!token) {
      setClaimStatus('error');
      setErrorMessage('無効なクレームリンクです。トークンパラメータが不足しています。');
      return;
    }

    if (authLoading) return;

    if (!user) {
      // 未ログインの場合はログインページにリダイレクト
      router.push(`/login?redirect=/claim?k=${token}`);
      return;
    }

    // ログイン済みの場合はクレーム処理を実行
    processClaim(token);
  }, [user, authLoading, searchParams, router]);

  const processClaim = async (token: string) => {
    try {
      setLoading(true);
      
      if (!user) {
        setClaimStatus('error');
        setErrorMessage('ユーザーが認証されていません');
        return;
      }

      // Firebase ID Tokenを取得
      const idToken = await user.getIdToken();

      // サーバーサイドでクレーム処理
      const response = await fetch('/api/claim/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          idToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 410) {
          setClaimStatus('expired');
        } else if (response.status === 409) {
          setClaimStatus('already-claimed');
        } else if (response.status === 403 && result.errorType === 'email_mismatch') {
          setClaimStatus('email-mismatch');
          setClaimData(result); // メール不一致時の詳細情報を保存
        } else {
          setClaimStatus('error');
        }
        setErrorMessage(result.error || result.message || 'クレーム処理中にエラーが発生しました');
        return;
      }

      // 成功時の処理
      setClaimStatus('success');
      
      // メモリーIDを保存（リダイレクト用）
      if (result.memoryId) {
        setClaimData({ ...claimData, memoryId: result.memoryId });
      }

    } catch (error) {
      console.error('クレーム処理エラー:', error);
      setClaimStatus('error');
      setErrorMessage('クレーム処理中にエラーが発生しました。再試行するか、サポートにお問い合わせください。');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (claimData?.memoryId) {
      router.push(`/memories/${claimData.memoryId}/edit`);
    } else {
      router.push('/dashboard');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
            <p className="text-indigo-600">クレームを処理中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">メモリーをクレーム</CardTitle>
          <CardDescription>
            {claimStatus === 'verifying' && 'クレームを確認中...'}
            {claimStatus === 'success' && 'クレーム成功！'}
            {claimStatus === 'error' && 'クレーム失敗'}
            {claimStatus === 'expired' && 'クレーム期限切れ'}
            {claimStatus === 'already-claimed' && '既にクレーム済み'}
            {claimStatus === 'email-mismatch' && 'メールアドレス不一致'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {claimStatus === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  想い出クラウドへようこそ！
                </h3>
                <p className="text-gray-600 mb-4">
                  メモリーが正常にクレームされました。美しいメモリーページの作成を開始できます。
                </p>
                <Button onClick={handleContinue} className="w-full">
                  作成を開始
                </Button>
              </div>
            </div>
          )}

          {claimStatus === 'error' && (
            <div className="text-center space-y-4">
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  クレーム失敗
                </h3>
                <p className="text-gray-600 mb-4">
                  {errorMessage}
                </p>
                <Button onClick={() => router.push('/dashboard')} variant="outline" className="w-full">
                  ダッシュボードへ
                </Button>
              </div>
            </div>
          )}

          {claimStatus === 'expired' && (
            <div className="text-center space-y-4">
              <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  クレーム期限切れ
                </h3>
                <p className="text-gray-600 mb-4">
                  {errorMessage}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  新しいクレームリンクをリクエストするには、サポートにお問い合わせください。
                </p>
                <Button onClick={() => router.push('/dashboard')} variant="outline" className="w-full">
                  ダッシュボードへ
                </Button>
              </div>
            </div>
          )}

          {claimStatus === 'already-claimed' && (
            <div className="text-center space-y-4">
              <AlertCircle className="h-16 w-16 text-blue-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  既にクレーム済み
                </h3>
                <p className="text-gray-600 mb-4">
                  {errorMessage}
                </p>
                <Button onClick={() => router.push('/dashboard')} className="w-full">
                  ダッシュボードへ
                </Button>
              </div>
            </div>
          )}

          {claimStatus === 'email-mismatch' && (
            <div className="text-center space-y-4">
              <AlertCircle className="h-16 w-16 text-orange-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  メールアドレスが一致しません
                </h3>
                <div className="text-sm text-gray-600 mb-4 space-y-2">
                  <p><strong>クレームリンク宛先:</strong> {claimData?.claimEmail}</p>
                  <p><strong>現在のログイン:</strong> {claimData?.userEmail}</p>
                </div>
                <p className="text-gray-600 mb-4">
                  {errorMessage}
                </p>
                <div className="space-y-2">
                  <Button 
                    onClick={() => router.push(`/claim/change-email?requestId=${claimData?.requestId}`)} 
                    className="w-full"
                  >
                    メールアドレスを変更
                  </Button>
                  <Button 
                    onClick={() => router.push('/dashboard')} 
                    variant="outline" 
                    className="w-full"
                  >
                    ダッシュボードへ
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
