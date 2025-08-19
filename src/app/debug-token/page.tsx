// src/app/debug-token/page.tsx
'use client';
import { signInAnonymously } from 'firebase/auth';
import { useState } from 'react';
import { auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

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

  async function callApi(endpoint: string) {
    try {
      setLoading(true);
      setResult(`API (${endpoint}) を呼び出し中...`);
      const res = await fetch(endpoint, {
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
  
  async function callGetApi(endpoint: string) {
    try {
      setLoading(true);
      setResult(`API (${endpoint}) を呼び出し中...`);
      const res = await fetch(endpoint, { method: 'GET' });
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
          
          <Card>
            <CardHeader>
                <CardTitle className="text-lg">ステップ1: 環境変数とAdmin SDKの初期化</CardTitle>
            </CardHeader>
             <CardContent className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => callGetApi('/api/env-check')} disabled={loading} className="w-full sm:w-auto">
                  {loading && result?.includes('/api/env-check') ? <Loader2 className="mr-2" /> : "1a."}
                  /api/env-check
                </Button>
                <Button onClick={() => callGetApi('/api/debug-admin')} disabled={loading} className="w-full sm:w-auto">
                   {loading && result?.includes('/api/debug-admin') ? <Loader2 className="mr-2" /> : "1b."}
                  /api/debug-admin
                </Button>
            </CardContent>
          </Card>

           <Card>
            <CardHeader>
                <CardTitle className="text-lg">ステップ2: クライアントサイドでのトークン取得</CardTitle>
            </CardHeader>
             <CardContent>
                <Button onClick={getToken} disabled={loading} className="w-full sm:w-auto">
                    {loading && !result ? <Loader2 className="mr-2" /> : "2."}
                    クライアントトークン取得
                </Button>
                <div className="space-y-2 mt-4">
                    <Label>UID:</Label>
                    <pre className="p-2 bg-gray-100 rounded-md text-sm break-all">{uid || 'N/A'}</pre>
                </div>
                <div className="space-y-2 mt-2">
                    <Label>IDトークン (最初の60文字):</Label>
                    <pre className="p-2 bg-gray-100 rounded-md text-sm break-all">{token ? `${token.slice(0, 60)}...` : 'N/A'}</pre>
                </div>
             </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="text-lg">ステップ3: サーバーサイドでのトークン検証</CardTitle>
            </CardHeader>
             <CardContent className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => callApi('/api/auth/verifyIdToken')} disabled={!token || loading} className="w-full sm:w-auto">
                  {loading && result?.includes('/api/auth/verifyIdToken') ? <Loader2 className="mr-2" /> : "3."}
                  /api/auth/verifyIdToken
                </Button>
             </CardContent>
          </Card>

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
