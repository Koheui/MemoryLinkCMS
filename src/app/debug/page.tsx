'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Database, Mail, Shield } from 'lucide-react';
import { getClaimRequestById } from '@/lib/firestore';

export default function DebugPage() {
  const { user, loading, currentTenant } = useAuth();
  const router = useRouter();
  const [claimRequests, setClaimRequests] = useState<any[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const loadClaimRequests = async () => {
    setLoadingClaims(true);
    try {
      // 簡易的なclaimRequests取得（実際の実装では適切なクエリを使用）
      console.log('Loading claim requests for tenant:', currentTenant);
      // TODO: 実際のclaimRequests取得を実装
    } catch (error) {
      console.error('Error loading claim requests:', error);
    } finally {
      setLoadingClaims(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">デバッグページ</h1>
          <p className="text-gray-600 mt-2">
            システムの動作状況を確認できます
          </p>
        </div>

        <div className="grid gap-6">
          {/* ユーザー情報 */}
          <Card>
            <CardHeader>
              <CardTitle>ユーザー情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>UID:</strong> {user.uid}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Tenant:</strong> {currentTenant}</p>
                <p><strong>Created:</strong> {user.createdAt.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* システム状況 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-600" />
                <span>システム状況</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">認証: 正常</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Firestore: 正常</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Storage: 正常</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* テスト機能 */}
          <Card>
            <CardHeader>
              <CardTitle>テスト機能</CardTitle>
              <CardDescription>
                開発・テスト用の機能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={loadClaimRequests}
                  disabled={loadingClaims}
                  variant="outline"
                >
                  {loadingClaims ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4 mr-2" />
                  )}
                  ClaimRequestsを読み込み
                </Button>
                
                <Button 
                  onClick={() => router.push('/')}
                  variant="outline"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  LPページに戻る
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
