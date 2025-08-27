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
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  type User,
} from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getFirestore, collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';


// This function should ONLY be called right after a user signs up for the first time.
// It finds any orders/memories created for their email before they signed up
// and assigns those records to their new user UID.
const claimUnclaimedData = async (user: User) => {
    if (!user || !user.email) {
        console.log("claimUnclaimedData: No user or email, skipping.");
        return;
    }
    
    const app = await getFirebaseApp();
    const db = getFirestore(app);

    console.log(`claimUnclaimedData: Starting process for user ${user.uid} with email ${user.email}`);
    const batch = writeBatch(db);
    let claimedData = false;

    try {
        // Find unclaimed orders by email. This requires a composite index on (email, userUid).
        console.log(`claimUnclaimedData: Querying orders where email is ${user.email} and userUid is null.`);
        const ordersQuery = query(
            collection(db, 'orders'),
            where('email', '==', user.email),
            where('userUid', '==', null)
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        console.log(`claimUnclaimedData: Found ${ordersSnapshot.size} unclaimed orders.`);

        if (!ordersSnapshot.empty) {
            const memoryIdsToUpdate: string[] = [];
            ordersSnapshot.forEach(orderDoc => {
                console.log(`claimUnclaimedData: Claiming order ${orderDoc.id} for user ${user.uid}`);
                const orderRef = doc(db, 'orders', orderDoc.id);
                batch.update(orderRef, { userUid: user.uid });
                const memoryId = orderDoc.data().memoryId;
                if (memoryId) {
                    memoryIdsToUpdate.push(memoryId);
                }
            });
            
            // Find associated memories and claim them
            if (memoryIdsToUpdate.length > 0) {
                console.log(`claimUnclaimedData: Found memory IDs to update:`, memoryIdsToUpdate);
                // Firestore 'in' queries are limited to 30 items. Handle chunking if necessary.
                const memoriesQuery = query(
                    collection(db, 'memories'),
                    where('__name__', 'in', memoryIdsToUpdate)
                );
                const memoriesSnapshot = await getDocs(memoriesQuery);
                console.log(`claimUnclaimedData: Found ${memoriesSnapshot.size} associated memories to claim.`);
                memoriesSnapshot.forEach(memoryDoc => {
                    if(memoryDoc.data().ownerUid === null) {
                        console.log(`claimUnclaimedData: Claiming memory ${memoryDoc.id} for user ${user.uid}`);
                        const memoryRef = doc(db, 'memories', memoryDoc.id);
                        batch.update(memoryRef, { ownerUid: user.uid });
                    } else {
                        console.log(`claimUnclaimedData: Memory ${memoryDoc.id} already has an owner.`);
                    }
                });
            }
            claimedData = true;
        }

        if (claimedData) {
            console.log("claimUnclaimedData: Committing claimed data batch...");
            await batch.commit();
            console.log("claimUnclaimedData: Batch committed successfully.");
        } else {
            console.log("claimUnclaimedData: No data to claim.");
        }
    } catch (error) {
        console.error("claimUnclaimedData: Error during data claiming process.", error);
        // We throw the error so the calling function (handleSubmit) can handle it and show a toast.
        throw error;
    }
};


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
        const app = await getFirebaseApp();
        const auth = getAuth(app);

        if (type === 'signup') {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // After user is created, attempt to claim any existing data
            await claimUnclaimedData(userCredential.user);
            
            toast({ title: '登録完了', description: 'ようこそ！ダッシュボードへ移動します。' });
            // The redirection is now handled by the AuthProvider upon state change.

        } else {
            // Login
            await signInWithEmailAndPassword(auth, email, password);
            toast({ title: 'ログインしました', description: 'ようこそ！' });
            // The redirection is now handled by the AuthProvider upon state change.
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
        } else if (error.code === 'failed-precondition' || error.code === 'permission-denied') {
            errorMessage = 'データの引き継ぎに失敗しました。管理者に問い合わせてください。'
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
