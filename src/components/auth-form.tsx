
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  UserCredential,
  User
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
import { useRouter, useSearchParams } from 'next/navigation';

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
  const searchParams = useSearchParams();

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  
  const handleAuthSuccess = (user: User) => {
    if (!user.emailVerified) {
      router.push(`/verify-email?email=${user.email}`);
      return;
    }
    // On success and verified, go to the dashboard.
    router.push('/dashboard');
  }

  const onSubmit = async (data: AuthFormValues) => {
    setLoading(true);

    try {
      if (type === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const user = userCredential.user;
        
        // Send verification email
        await sendEmailVerification(user);

        const userType = searchParams.get('type') || 'other';

        // Create user profile in 'users' collection
        const userRef = doc(db, 'users', user.uid);
        const userProfile: Omit<UserProfile, 'id'> = {
          email: user.email!,
          // @ts-ignore
          userType: userType, // Store the type from query param
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(userRef, userProfile);
        
        toast({ title: "確認メールを送信しました", description: "アカウントを有効化するため、メールをご確認ください。"});
        // After signup, take user to the verification notice page.
        router.push(`/verify-email?email=${data.email}`);

      } else { // Login
        const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
            toast({
                variant: 'destructive',
                title: 'メールアドレス未確認',
                description: 'このアカウントはまだ有効化されていません。確認メールを再送信しますので、メールをご確認ください。',
            });
            await sendEmailVerification(user);
            router.push(`/verify-email?email=${user.email}`);
            return;
        }
        
        handleAuthSuccess(user);
      }

    } catch (error: any) {
        let description = '予期せぬエラーが発生しました。';
        if (error.code) {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    description = 'このメールアドレスは既に使用されています。ログイン画面からお進みください。';
                    break;
                case 'auth/invalid-credential':
                     description = 'メールアドレスまたはパスワードが正しくありません。';
                     break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                     description = 'メールアドレスまたはパスワードが正しくありません。';
                     break;
                case 'auth/too-many-requests':
                    description = '試行回数が上限に達しました。後ほどもう一度お試しください。';
                    break;
                default:
                    description = `Firebaseエラー: ${error.message} (コード: ${error.code})`;
            }
        } else {
            description = `エラー: ${error.message}`;
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
    : 'ログインしてページの管理を続けましょう。';
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
