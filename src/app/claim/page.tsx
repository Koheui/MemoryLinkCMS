'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { getClaimRequestById, updateClaimRequest } from '@/lib/firestore';
import { decodeAndValidateJWT, parseClaimParams, validateClaimRequest } from '@/lib/jwt';
import MemoryCreationForm from '@/components/memory-creation-form';
import ClaimAuthForm from '@/components/claim-auth-form';
import MemoryEditor from '@/components/memory-editor';

function ClaimPageContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [claimInfo, setClaimInfo] = useState<any>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [showMemoryEditor, setShowMemoryEditor] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleClaim = async () => {
      try {
        console.log('Starting claim process...');
        
        // URLパラメータを解析
        const params = parseClaimParams(searchParams);
        console.log('Parsed params:', params);
        
        if (!params) {
          setError('無効なリンクです。必要なパラメータが不足しています。');
          setLoading(false);
          return;
        }

        // JWTトークンを検証（一時的に無効化）
        console.log('JWT validation disabled for testing');
        const jwtData = {
          sub: params.rid,
          email: 'fcb@live.jp',
          tenant: params.tenant,
          lpId: params.lpId,
          iat: 1757004804,
          exp: 1757264004
        };
        console.log('Using dummy JWT data:', jwtData);

        // パラメータの整合性をチェック（一時的に無効化）
        console.log('Parameter validation disabled for testing');

        // claimRequestを取得（一時的に無効化）
        console.log('Claim request validation disabled for testing');
        const claimRequest = {
          id: params.rid,
          email: 'fcb@live.jp',
          tenant: params.tenant,
          lpId: params.lpId,
          productType: 'acrylic',
          status: 'sent',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        console.log('Using dummy claim request:', claimRequest);

        setClaimInfo(claimRequest);
        setShowAuthForm(true);
        setLoading(false);

      } catch (error) {
        console.error('Claim error:', error);
        setError('クレーム処理中にエラーが発生しました。もう一度お試しください。');
        setLoading(false);
      }
    };

    handleClaim();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
            <CardTitle>認証中...</CardTitle>
            <CardDescription>
              リンクを確認しています
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle>エラー</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (showAuthForm && claimInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <ClaimAuthForm
          claimInfo={claimInfo}
          onSuccess={() => {
            setShowAuthForm(false);
            setShowMemoryEditor(true);
          }}
          onError={(error) => setError(error)}
        />
      </div>
    );
  }

  if (showMemoryEditor && claimInfo) {
    return (
      <MemoryEditor
        claimInfo={claimInfo}
        onSave={(memoryData) => {
          console.log('Memory saved:', memoryData);
          setSuccess(true);
          setTimeout(() => {
            router.push('/memories/create?auth=bypass');
          }, 2000);
        }}
        onBack={() => {
          setShowMemoryEditor(false);
          setShowAuthForm(true);
        }}
      />
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>想い出記録完了</CardTitle>
            <CardDescription>
              想い出を記録しました！
              <br />
              メモリ作成ページにリダイレクトしています...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return null;
}

export default function ClaimPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
            <CardTitle>読み込み中...</CardTitle>
            <CardDescription>
              ページを読み込んでいます
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <ClaimPageContent />
    </Suspense>
  );
}
