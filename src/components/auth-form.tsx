// src/components/auth-form.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/client';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';


interface AuthFormProps {
  type: 'login' | 'signup';
}

export function AuthForm({ type }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const title = type === 'login' ? 'ログイン' : '新規アカウント登録';
  const description =
    type === 'login'
      ? '登録したメールアドレスとパスワードでログインします。'
      : '初めての方はこちらからご登録ください。';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        toast({ title: '登録完了', description: 'ようこそ！ダッシュボードへ移動します。' });
        setLoading(false);
        // Use window.location.assign for a full page reload to ensure auth state is propagated correctly.
        window.location.assign('/dashboard');

      } else {
        // Login
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'ログインしました', description: 'ようこそ！' });
        setLoading(false);
         // Use window.location.assign for a full page reload to ensure auth state is propagated correctly.
        window.location.assign('/dashboard');
      }
    } catch (error: any) {
      console.error("Authentication Error:", error);
      let errorMessage = 'エラーが発生しました。';
       if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'このメールアドレスは既に使用されています。ログインしてください。';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません。';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'パスワードは6文字以上で設定してください。';
      } else if (error.message.includes('auth/network-request-failed')) {
        errorMessage = 'ネットワークエラーが発生しました。接続を確認して再度お試しください。'
      }
      toast({
        variant: 'destructive',
        title: '認証エラー',
        description: errorMessage,
      });
      setLoading(false);
    }
  };

  const renderFooter = () => {
    if (type === 'login') {
      return (
        <p className="px-6 text-center text-sm text-muted-foreground">
          アカウントをお持ちでないですか？{' '}
          <Link
            href="/signup"
            className="underline underline-offset-4 hover:text-primary"
          >
            新規登録
          </Link>
        </p>
      );
    }
    return (
      <p className="px-6 text-center text-sm text-muted-foreground">
        すでにアカウントをお持ちですか？{' '}
        <Link
          href="/login"
          className="underline underline-offset-4 hover:text-primary"
        >
          ログイン
        </Link>
      </p>
    );
  };

  return (
    <div className="flex h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {type === 'login' ? 'ログイン' : '登録する'}
            </Button>
            {renderFooter()}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
