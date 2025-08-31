'use client';

import { useEffect, useState } from 'react';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { createMemory } from '@/lib/firestore';
import { Memory } from '@/types';

export default function ClaimPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleEmailLink = async () => {
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setError('無効なログインリンクです。');
        setLoading(false);
        return;
      }

      try {
        // ローカルストレージからメールアドレスを取得
        let email = window.localStorage.getItem('emailForSignIn');
        
        if (!email) {
          // メールアドレスが保存されていない場合はユーザーに入力してもらう
          email = window.prompt('ログインに使用したメールアドレスを入力してください:');
        }

        if (!email) {
          setError('メールアドレスが必要です。');
          setLoading(false);
          return;
        }

        // メールリンクでサインイン
        const result = await signInWithEmailLink(auth, email, window.location.href);
        
        // ローカルストレージからメールアドレスを削除
        window.localStorage.removeItem('emailForSignIn');

        // JWTトークンを取得してクレーム処理
        const idToken = await result.user.getIdToken();
        const jwt = searchParams.get('k');
        
        if (jwt) {
          try {
            // TODO: Functions APIを呼び出してクレーム処理
            // const response = await fetch('/api/claim', {
            //   method: 'POST',
            //   headers: {
            //     'Authorization': `Bearer ${idToken}`,
            //     'Content-Type': 'application/json',
            //   },
            //   body: JSON.stringify({ jwt }),
            // });
            
            // 仮の処理：新しいmemoryを作成
            const newMemory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'> = {
              ownerUid: result.user.uid,
              title: '新しい想い出',
              type: 'personal',
              status: 'draft',
              design: {
                theme: 'default',
                layout: 'standard',
                colors: {
                  primary: '#3B82F6',
                  secondary: '#6B7280',
                  background: '#FFFFFF',
                },
              },
              blocks: [],
            };
            
            const memoryId = await createMemory(newMemory);
            console.log('Created new memory:', memoryId);
          } catch (claimError) {
            console.error('Claim error:', claimError);
            // クレーム処理に失敗してもログインは成功とする
          }
        }

        setSuccess(true);
        
        // ダッシュボードにリダイレクト
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);

      } catch (error) {
        console.error('Error signing in with email link:', error);
        setError('ログインに失敗しました。もう一度お試しください。');
      } finally {
        setLoading(false);
      }
    };

    handleEmailLink();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
            <CardTitle>ログイン中...</CardTitle>
            <CardDescription>
              認証を確認しています
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle>エラー</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/login')}
              className="w-full"
            >
              ログインページに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>ログイン成功</CardTitle>
            <CardDescription>
              ダッシュボードにリダイレクトしています...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return null;
}
