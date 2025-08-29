'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

export default function ChangeEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [requestId, setRequestId] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'submitted'>('form');

  useEffect(() => {
    const requestIdParam = searchParams.get('requestId');
    if (!requestIdParam) {
      router.push('/dashboard');
      return;
    }
    setRequestId(requestIdParam);
  }, [searchParams, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !requestId || !newEmail) return;

    try {
      setLoading(true);
      const idToken = await user.getIdToken();

      const response = await fetch('/api/claim/change-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          requestId,
          newEmail,
          // TODO: reCAPTCHA実装時にrecaptchaTokenを追加
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'メールアドレス変更に失敗しました');
      }

      setStep('submitted');
      toast({
        title: '確認メール送信完了',
        description: `${newEmail} に確認メールを送信しました`,
      });

    } catch (error) {
      console.error('メールアドレス変更エラー:', error);
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: error instanceof Error ? error.message : 'メールアドレス変更に失敗しました',
      });
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  if (authLoading || !requestId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">メールアドレス変更</CardTitle>
          <CardDescription>
            {step === 'form' && 'クレームリンクの宛先メールアドレスを変更します'}
            {step === 'submitted' && '確認メールを送信しました'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newEmail">新しいメールアドレス</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@example.com"
                  required
                />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">変更プロセス：</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>新しいメールアドレスに確認メールを送信</li>
                      <li>確認メール内のリンクをクリック</li>
                      <li>メールアドレス変更が完了</li>
                      <li>新しいクレームリンクを再送信</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !isValidEmail(newEmail)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      送信中...
                    </>
                  ) : (
                    '確認メールを送信'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  戻る
                </Button>
              </div>
            </form>
          )}

          {step === 'submitted' && (
            <div className="text-center space-y-4">
              <Mail className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  確認メールを送信しました
                </h3>
                <p className="text-gray-600 mb-4">
                  <strong>{newEmail}</strong> に確認メールを送信しました。
                  メール内のリンクをクリックして、メールアドレス変更を完了してください。
                </p>
                <div className="space-y-2">
                  <Button onClick={() => router.push('/dashboard')} className="w-full">
                    ダッシュボードへ
                  </Button>
                  <Button 
                    onClick={() => setStep('form')} 
                    variant="outline" 
                    className="w-full"
                  >
                    別のメールアドレスで再試行
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


