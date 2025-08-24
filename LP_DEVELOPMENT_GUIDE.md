
# 【指示書】MemoryLink CMS フロントエンド（LP兼認証）アプリ開発仕様

## 1. プロジェクトの目的

このプロジェクトの目的は、既に存在する「MemoryLink CMS」の**バックエンドサービスに接続するための、新しいフロントエンドアプリケーションを構築すること**です。

このアプリケーションは、サービスの顔となる**ランディングページ（LP）**の役割と、ユーザーがサービスを利用するための入り口となる**認証（サインアップ・ログイン）**の役割を担います。

あなたは、この指示書に厳密に従い、指定された技術スタックと認証フローを用いて、堅牢で信頼性の高いフロントエンドを構築してください。

---

## 2. 技術スタック

*   **フレームワーク**: Next.js (App Router)
*   **スタイリング**: Tailwind CSS, shadcn/ui
*   **認証基盤**: Firebase Authentication (Client SDK)

---

## 3. 実装すべき主要機能

1.  **ランディングページ (`/`)**:
    *   サービスの魅力を伝えるトップページ。
    *   サインアップおよびログインページへの導線を設置してください。

2.  **サインアップ機能 (`/signup`)**:
    *   ユーザーが「メールアドレス」と「パスワード」で新しいアカウントを作成できる機能。
    *   成功後は、**メールアドレスの有効性を確認するため**、Firebase Auth SDKの`sendEmailVerification`を呼び出し、確認メールを送信してください。
    *   ユーザーを「確認メールを送信しました」と案内するページ (`/verify-email`) へリダイレクトしてください。

3.  **ログイン機能 (`/login`)**:
    *   登録済みのユーザーが「メールアドレス」と「パスワード」でログインできる機能。
    *   **重要**: ログイン時、ユーザーの`emailVerified`プロパティが`false`の場合はログインを許可せず、「メールアドレスの確認が完了していません」というエラーメッセージを表示してください。
    *   ログイン成功後は、バックエンドのダッシュボードページ (`https://<バックエンドのドメイン>/dashboard`) へリダイレクトしてください。

4.  **メールアドレス確認ページ (`/verify-email`)**:
    *   サインアップ後に表示される静的な案内ページ。
    *   「登録ありがとうございます。確認用のメールを送信しましたので、メール内のリンクをクリックして登録を完了してください」といった趣旨のメッセージを表示してください。

---

## 4. バックエンドとの連携・認証フロー【最重要】

フロントエンドとバックエンドの連携で最も重要なのは**認証**です。過去のプロジェクトで多くの試行錯誤の末に確立された、以下の**唯一の正しい認証フロー**を、寸分違わず実装してください。これにより、認証に関するすべての問題を未然に防ぐことができます。

### 4.1. Firebaseクライアントの初期化

まず、バックエンドと同じFirebaseプロジェクトに接続します。以下の内容で `src/lib/firebase/client.ts` を作成してください。環境変数は別途 `.env.local` ファイルで設定します。

```typescript
// src/lib/firebase/client.ts
import { initializeApp, getApps, getApp, FirebaseApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(options: FirebaseOptions): FirebaseApp {
    if (!getApps().length) {
        return initializeApp(options);
    }
    return getApp();
}

export const app = getFirebaseApp(firebaseConfig);
export const auth = getAuth(app);
```

### 4.2. 認証フォームの実装 (`AuthForm`)

サインアップとログインのロジックは、以下の `src/components/auth-form.tsx` のコードをそのまま使用してください。これが最も安定した実装です。

```tsx
// src/components/auth-form.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/client';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
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
  const description = type === 'login'
      ? '登録したメールアドレスとパスワードでログインします。'
      : '初めての方はこちらからご登録ください。';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        toast({
          title: '確認メールを送信しました',
          description: 'ご登録のメールアドレスをご確認ください。',
        });
        router.push('/verify-email');
      } else {
        // Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) {
          throw new Error('メールアドレスの確認が完了していません。受信ボックスをご確認ください。');
        }
        toast({ title: 'ログインしました', description: 'ようこそ！' });
        // ★★★ バックエンドのドメインにリダイレクト ★★★
        window.location.assign('https://<本番のバックエンドドメイン>/dashboard');
      }
    } catch (error: any) {
      console.error(error);
      let errorMessage = error.message || 'エラーが発生しました。';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'このメールアドレスは既に使用されています。ログインしてください。';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません。';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'パスワードは6文字以上で設定してください。';
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
    // ... (省略: ログインとサインアップのリンク切り替え)
  };

  return (
    // ... (省略: JSXの構造)
  );
}
```

### 4.3. 環境変数

このフロントエンドアプリのルートに `.env.local` ファイルを作成し、**バックエンドで使用しているものと全く同じ**Firebaseプロジェクトのクライアント向け構成キーを設定してください。

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

---

## 5. まとめ

この指示書に従うことで、あなたは認証という最も複雑な部分をクリアし、LPの機能開発に集中できます。**特にセクション4の認証フローは、変更せずにそのまま実装してください。** これが、このプロジェクトを成功に導くための最も確実な道筋です。
