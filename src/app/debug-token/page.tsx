// src/app/debug-token/page.tsx
'use client';
import { signInAnonymously } from 'firebase/auth';
import { useState } from 'react';
import { auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function DebugToken() {
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
      setResult('APIを呼び出し中...');
      const res = await fetch('/api/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: 'debug.jpg',
          type: 'image',
          url: 'https://example.com/debug.jpg',
          storagePath: 'debug/dummy.jpg',
          projectId: 'debug-project',
          size: 1234,
        }),
      });
      const responseText = await res.text();
      setResult(`ステータス: ${res.status}\nレスポンス: ${responseText}`);
    } catch (e: any) {
      setResult(`APIの呼び出しに失敗しました: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>認証デバッグページ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={getToken} disabled={loading} className="w-full sm:w-auto">
              {loading && !result ? <Loader2 className="mr-2" /> : null}
              1. 匿名トークン取得
            </Button>
            <Button onClick={callApi} disabled={!token || loading} className="w-full sm:w-auto">
              {loading && result?.startsWith('API') ? <Loader2 className="mr-2" /> : null}
              2. /api/media 呼び出し
            </Button>
          </div>
          <div className="space-y-2">
            <Label>UID:</Label>
            <pre className="p-2 bg-gray-100 rounded-md text-sm break-all">{uid || 'N/A'}</pre>
          </div>
          <div className="space-y-2">
            <Label>IDトークン (最初の60文字):</Label>
            <pre className="p-2 bg-gray-100 rounded-md text-sm break-all">{token ? `${token.slice(0, 60)}...` : 'N/A'}</pre>
          </div>
        </CardContent>
        <CardFooter>
            <div className="w-full space-y-2">
                <Label>API呼び出し結果:</Label>
                <pre className="p-2 bg-gray-100 rounded-md text-sm break-all h-24 overflow-auto">{result || 'まだ呼び出されていません'}</pre>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
