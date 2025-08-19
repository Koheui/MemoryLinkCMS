// src/app/debug-token/page.tsx
'use client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = initializeApp(cfg);
const auth = getAuth(app);

export default function DebugTokenPage() {
  const [uid, setUid] = useState<string | undefined>();
  const [token, setToken] = useState<string | undefined>();
  const [result, setResult] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function getToken() {
    try {
      setLoading(true);
      setResult(undefined);
      await signInAnonymously(auth);
      const user = auth.currentUser!;
      setUid(user.uid);
      const t = await user.getIdToken(true);
      setToken(t);
    } catch (e: any) {
      setResult(`トークンの取得に失敗しました: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function callApi() {
    try {
      setLoading(true);
      setResult('Calling /api/auth/verifyIdToken...');
      const res = await fetch('/api/auth/verifyIdToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          // Dummy body for APIs that might need one
        }),
      });
      const responseText = await res.text();
      setResult(`ステータス: ${res.status}\nレスポンス:\n${responseText}`);
    } catch (e: any) {
      setResult(`APIの呼び出しに失敗しました: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>認証デバッグページ</CardTitle>
          <CardDescription>各ステップを順番に実行して、認証プロセスの問題を特定します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Button onClick={getToken} disabled={loading}>
              {loading ? <Loader2 className="mr-2 animate-spin" /> : null}
              1. 匿名ユーザーでサインインし、IDトークンを取得
            </Button>
            <div className="space-y-2 mt-4">
              <Label>UID:</Label>
              <pre className="p-2 bg-gray-100 rounded-md text-sm break-all">{uid || 'N/A'}</pre>
            </div>
            <div className="space-y-2 mt-2">
              <Label>IDトークン (最初の60文字):</Label>
              <pre className="p-2 bg-gray-100 rounded-md text-sm break-all">{token ? `${token.slice(0, 60)}...` : 'N/A'}</pre>
            </div>
          </div>
          <div className="space-y-4">
            <Button onClick={callApi} disabled={!token || loading}>
              {loading ? <Loader2 className="mr-2 animate-spin" /> : null}
              2. 取得したトークンをサーバーの検証APIに送る
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <div className="w-full space-y-2">
            <Label>API呼び出し結果:</Label>
            <pre className="p-4 bg-gray-900 text-white rounded-md text-sm break-all h-48 overflow-auto">{result || 'まだ呼び出されていません'}</pre>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
