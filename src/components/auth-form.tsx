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
import { getFirebaseApp } from '@/lib/firebase/client';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, writeBatch, query, where, collection, getDocs } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';


const claimUnclaimedData = async (user: User) => {
    if (!user || !user.email) {
        console.log("claimUnclaimedData: No user or email, skipping.");
        return;
    }
    
    const app = await getFirebaseApp();
    const db = getFirestore(app);

    const batch = writeBatch(db);
    let claimedData = false;

    try {
        // Find unclaimed orders by email.
        const ordersQuery = query(
            collection(db, 'orders'),
            where('email', '==', user.email),
            where('userUid', '==', null)
        );
        const ordersSnapshot = await getDocs(ordersQuery);

        if (!ordersSnapshot.empty) {
            const memoryIdsToUpdate: string[] = [];
            ordersSnapshot.forEach(orderDoc => {
                const orderRef = doc(db, 'orders', orderDoc.id);
                batch.update(orderRef, { userUid: user.uid });
                const memoryId = orderDoc.data().memoryId;
                if (memoryId) {
                    memoryIdsToUpdate.push(memoryId);
                }
            });
            
            // Find associated memories and claim them
            if (memoryIdsToUpdate.length > 0) {
                 // Firestore 'in' queries are limited to 30 items. Handle chunking if necessary.
                const memoryBatches: string[][] = [];
                for (let i = 0; i < memoryIdsToUpdate.length; i += 30) {
                    memoryBatches.push(memoryIdsToUpdate.slice(i, i + 30));
                }

                for (const batchIds of memoryBatches) {
                    const memoriesQuery = query(
                        collection(db, 'memories'),
                        where('__name__', 'in', batchIds)
                    );
                    const memoriesSnapshot = await getDocs(memoriesQuery);
                    memoriesSnapshot.forEach(memoryDoc => {
                        if(memoryDoc.data().ownerUid === null) {
                            const memoryRef = doc(db, 'memories', memoryDoc.id);
                            batch.update(memoryRef, { ownerUid: user.uid });
                        }
                    });
                }
            }
            claimedData = true;
        }

        if (claimedData) {
            await batch.commit();
        }
    } catch (error) {
        console.error("claimUnclaimedData: Error during data claiming process.", error);
        throw error; // Re-throw to be caught by the form handler
    }
};


interface AuthFormProps {
  type: 'login' | 'signup';
}

export function AuthForm({ type }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const title = type === 'login' ? 'ログイン' : '新規アカウント登録';
  const description =
    type === 'login'
      ? '登録したメールアドレスとパスワードでログインします。'
      : '初めての方はこちらからご登録ください。';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const app = getFirebaseApp();
      const auth = getAuth(app);

      if (type === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await claimUnclaimedData(userCredential.user);
        toast({ title: '登録完了', description: 'ようこそ！ダッシュボードへ移動します。' });
        router.push('/dashboard');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'ログインしました', description: 'ようこそ！' });
        router.push('/dashboard');
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
      } else {
        errorMessage = error.message;
      }

      toast({
        variant: 'destructive',
        title: '認証エラー',
        description: errorMessage,
      });
    } finally {
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
