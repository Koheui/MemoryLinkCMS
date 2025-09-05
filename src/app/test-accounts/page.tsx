'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateSecretKey } from '@/lib/secret-key-utils';
import { useSecretKeyAuth } from '@/contexts/secret-key-auth-context';

export default function TestAccountGenerator() {
  const { currentUser } = useSecretKeyAuth();
  const [generatedKeys, setGeneratedKeys] = useState<Array<{
    secretKey: string;
    email: string;
    tenant: string;
    lpId: string;
    productType: string;
    loginUrl: string;
  }>>([]);

  const generateTestAccount = () => {
    // 開発用の固定秘密鍵を使用
    const secretKey = 'emolinkemolinkemo';
    const email = `test-${Date.now()}@example.com`;
    const tenant = 'futurestudio';
    const lpId = 'emolink.cloud';
    const productType = 'acrylic';
    
    // LP風のメールリンク形式で生成
    const loginUrl = `${window.location.origin}/claim?rid=test-${Date.now()}&tenant=${tenant}&lpId=${lpId}&k=${btoa(JSON.stringify({
      requestId: `test-${Date.now()}`,
      email: email,
      tenant: tenant,
      lpId: lpId,
      secretKey: secretKey,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30日
    }))}`;
    
    const newKey = {
      secretKey,
      email,
      tenant,
      lpId,
      productType,
      loginUrl
    };
    
    setGeneratedKeys(prev => [newKey, ...prev]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">テスト用アカウント生成</h1>
          <p className="mt-2 text-gray-600">CMSテスト用の秘密鍵とログインリンクを生成します</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>LP風メールリンク生成</CardTitle>
            <CardDescription>
              LPが実際に送信するメールリンクと同じ形式でテスト用リンクを生成します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-800 text-sm">
                  <strong>使用する秘密鍵:</strong> <code>emolinkemolinkemo</code> (開発用固定)
                </p>
              </div>
              <Button onClick={generateTestAccount} className="w-full">
                LP風メールリンクを生成
              </Button>
            </div>
          </CardContent>
        </Card>

        {generatedKeys.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">生成されたテストアカウント</h2>
            
            {generatedKeys.map((key, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>テストアカウント #{index + 1}</span>
                    <Badge variant="outline">{key.productType}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">秘密鍵</label>
                      <div className="flex items-center space-x-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {key.secretKey}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(key.secretKey)}
                        >
                          コピー
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">メールアドレス</label>
                      <div className="flex items-center space-x-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {key.email}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(key.email)}
                        >
                          コピー
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">テナント</label>
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                        {key.tenant}
                      </code>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">LP ID</label>
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                        {key.lpId}
                      </code>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">LP風メールリンク</label>
                    <div className="flex items-center space-x-2">
                      <code className="bg-blue-50 px-2 py-1 rounded text-sm text-blue-800 flex-1 break-all">
                        {key.loginUrl}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(key.loginUrl)}
                      >
                        コピー
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      LPが実際に送信するメールリンクと同じ形式です
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => window.open(key.loginUrl, '_blank')}
                      className="flex-1"
                    >
                      新しいタブで開く
                    </Button>
                    <Button
                      onClick={() => window.location.href = key.loginUrl}
                      variant="outline"
                      className="flex-1"
                    >
                      このタブで開く
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>使用方法</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>1. 「LP風メールリンクを生成」ボタンをクリック</p>
            <p>2. 生成されたLP風メールリンクをコピー</p>
            <p>3. メールリンクをクリックしてCMSにアクセス</p>
            <p>4. 自動的にログインされてテストを開始</p>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800 text-sm">
                <strong>注意:</strong> このリンクはLPが実際に送信するメールリンクと同じ形式です。
                本番環境でのテストが可能です。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
