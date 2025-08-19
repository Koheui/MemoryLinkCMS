"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

// Function to create user profile in Firestore
const createUserProfile = async (user: User) => {
  const userRef = doc(db, 'users', user.uid);
  const userProfile: Omit<UserProfile, 'id'> = {
      email: user.email!,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
  };
  await setDoc(userRef, userProfile);
};

async function createSession(user: User) {
    const idToken = await user.getIdToken(true);
    const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idToken })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Session creation failed');
    }
}


export function AuthForm({ type }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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
        await createUserProfile(userCredential.user);
        await createSession(userCredential.user);
        router.push('/memories/new');
      } else {
        userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
        await createSession(userCredential.user);
        router.push('/dashboard');
      }
      // Force a page refresh to ensure new server-side state is loaded
      router.refresh();

    } catch (error: any) {
      console.error("Auth error:", error);
      let description = 'エラーが発生しました。もう一度お試しください。';
      if (error.code === 'auth/email-already-in-use') {
        description = 'このメールアドレスは既に使用されています。ログインするか、別のメールアドレスで登録してください。'
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        description = 'メールアドレスまたはパスワードが正しくありません。'
      }
      toast({
        variant: 'destructive',
        title: type === 'signup' ? 'アカウント作成に失敗しました' : 'ログインに失敗しました',
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
