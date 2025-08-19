"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  email: z.string().email({ message: '有効なメールアドレスを入力してください。' }),
  password: z
    .string()
    .min(6, { message: 'パスワードは6文字以上で入力してください。' }),
});

type AuthFormValues = z.infer<typeof formSchema>;

interface AuthFormProps {
  type: 'login' | 'signup';
}

export function AuthForm({ type }: AuthFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: AuthFormValues) => {
    setLoading(true);
    try {
      let userCredential;
      if (type === 'signup') {
        userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        // Create user profile in Firestore
        const userRef = doc(db, 'users', userCredential.user.uid);
        const userProfile: Omit<UserProfile, 'id'> = {
            email: userCredential.user.email!,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        await setDoc(userRef, userProfile);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      }
      
      const idToken = await userCredential.user.getIdToken(true);

      const res = await fetch('/api/auth/sessionLogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Session creation failed:', errorData);
        throw new Error(errorData.details || 'Failed to create session');
      }

      // Refresh the page. The middleware will handle the redirect.
      router.refresh();

    } catch (error: any) {
        console.error("Auth error:", error);
        let description = 'エラーが発生しました。もう一度お試しください。';
        if (error.code === 'auth/email-already-in-use') {
            description = 'このメールアドレスは既に使用されています。'
        } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
             description = 'メールアドレスまたはパスワードが正しくありません。';
        } else if (error.message.includes('session')) {
            description = `サーバーとのセッション確立に失敗しました。詳細: ${error.message}`;
        }
        toast({
            variant: 'destructive',
            title: type === 'signup' ? 'アカウント作成失敗' : 'ログイン失敗',
            description: description,
        });
    } finally {
        setLoading(false);
    }
  };

  const title = type === 'signup' ? 'アカウント作成' : 'おかえりなさい';
  const description = type === 'signup'
    ? 'メールアドレスとパスワードを入力して始めましょう。'
    : 'ログインして想い出の管理を続けましょう。';
  const buttonText = type === 'signup' ? 'アカウントを作成' : 'ログイン';
  const footerText = type === 'signup'
    ? 'すでにアカウントをお持ちですか？'
    : "アカウントをお持ちでないですか？";
  const footerLink = type === 'signup' ? '/login' : '/signup';
  const footerLinkText = type === 'signup' ? 'ログイン' : 'アカウント作成';

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              {...form.register('email')}
              autoComplete="email"
              disabled={loading}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              required
              {...form.register('password')}
              autoComplete={type === 'login' ? 'current-password' : 'new-password'}
              disabled={loading}
            />
             {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {buttonText}
          </Button>
           <div className="text-sm text-muted-foreground">
            {footerText}{' '}
            <Link href={footerLink} className="underline hover:text-primary" prefetch={false}>
              {footerLinkText}
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
