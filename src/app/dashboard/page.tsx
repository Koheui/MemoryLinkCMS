'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Users, Building, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useMemories } from '@/hooks/use-memories';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { data: memories = [], isLoading: memoriesLoading, error } = useMemories(user?.uid || '');

  useEffect(() => {
    console.log('Dashboard: useEffect triggered - user =', user, 'loading =', loading);
    if (!loading && !user) {
      console.log('Dashboard: No user found, redirecting to /');
      router.push('/');
    } else if (!loading && user) {
      console.log('Dashboard: User found, staying on dashboard');
    }
  }, [user, loading, router]);

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'personal':
        return <Heart className="w-4 h-4" />;
      case 'family':
        return <Users className="w-4 h-4" />;
      case 'business':
        return <Building className="w-4 h-4" />;
      default:
        return <Heart className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'personal':
        return '個人';
      case 'family':
        return '家族';
      case 'business':
        return 'ビジネス';
      default:
        return 'その他';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600 mt-2">
            {user.email} でログイン中
          </p>
          <p className="text-sm text-gray-500 mt-1">
            新しい想い出はLPからの流入時に自動生成されます
          </p>
        </div>

        <div className="grid gap-6">
          {/* Firebase接続状態 - 一時的に無効化 */}
          {/* <FirebaseStatus /> */}

          <Card>
            <CardHeader>
              <CardTitle>あなたの想い出</CardTitle>
              <CardDescription>
                LPから流入して生成された想い出ページの一覧です
              </CardDescription>
            </CardHeader>
            <CardContent>
              {memoriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">読み込み中...</span>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600 mb-4">
                    データの取得に失敗しました
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.reload()}
                  >
                    再読み込み
                  </Button>
                </div>
              ) : memories.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    まだ想い出がありません
                  </p>
                  <p className="text-sm text-gray-500">
                    LPから流入すると、新しい想い出が自動生成されます
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {memories.map((memory) => (
                    <div
                      key={memory.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/memories/${memory.id}`)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          {getTypeIcon(memory.type)}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {memory.title || '無題'}
                          </h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>{getTypeLabel(memory.type)}</span>
                            <span>•</span>
                            <span>
                              {memory.status === 'published' ? '公開済み' : '下書き'}
                            </span>
                            <span>•</span>
                            <span>更新: {formatDate(memory.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {memory.status === 'published' && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            公開中
                          </span>
                        )}
                        <Button variant="outline" size="sm">
                          編集
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
