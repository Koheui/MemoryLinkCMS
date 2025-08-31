'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Eye, ArrowLeft } from 'lucide-react';
import { Memory, Asset } from '@/types';
import { useMemory, useCreateMemory, useUpdateMemory } from '@/hooks/use-memories';
import { FileUpload } from '@/components/file-upload';
import { getAssetsByMemory } from '@/lib/firestore';

export default function MemoryEditPage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [saving, setSaving] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);

  const { data: existingMemory, isLoading: memoryLoading } = useMemory(params.id === 'new' ? '' : params.id);
  const createMemoryMutation = useCreateMemory();
  const updateMemoryMutation = useUpdateMemory();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (params.id === 'new') {
      // 新規作成
      setMemory({
        id: 'new',
        ownerUid: user?.uid || '',
        title: '',
        type: 'personal',
        status: 'draft',
        design: {
          theme: 'default',
          layout: 'standard',
          colors: {
            primary: '#3B82F6',
            secondary: '#6B7280',
            background: '#FFFFFF',
          },
        },
        blocks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else if (existingMemory) {
      // 既存のmemoryを設定
      setMemory(existingMemory);
      
      // アセットを取得
      loadAssets(existingMemory.id);
    }
  }, [params.id, user, existingMemory]);

  const loadAssets = async (memoryId: string) => {
    try {
      const assetsData = await getAssetsByMemory(memoryId);
      setAssets(assetsData);
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  };

  const handleSave = async () => {
    if (!memory || !user) return;
    
    setSaving(true);
    try {
      if (params.id === 'new') {
        // 新規作成
        const { id, createdAt, updatedAt, ...memoryData } = memory;
        const newMemoryId = await createMemoryMutation.mutateAsync(memoryData);
        router.push(`/memories/${newMemoryId}`);
      } else {
        // 更新
        const { id, createdAt, updatedAt, ...updates } = memory;
        await updateMemoryMutation.mutateAsync({
          memoryId: params.id,
          updates,
        });
      }
    } catch (error) {
      console.error('Error saving memory:', error);
      alert('保存に失敗しました。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!memory) return;
    
    setSaving(true);
    try {
      // TODO: 公開処理（Functions API呼び出し）
      console.log('Publishing memory:', memory);
      await new Promise(resolve => setTimeout(resolve, 1000)); // ダミー処理
    } catch (error) {
      console.error('Error publishing memory:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadComplete = (asset: Asset) => {
    setAssets(prev => [...prev, asset]);
  };

  if (loading || memoryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user || !memory) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {params.id === 'new' ? '新しい想い出を作成' : memory.title || '無題'}
              </h1>
              <p className="text-gray-600 mt-2">
                想い出ページを編集してください
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              保存
            </Button>
            <Button
              onClick={handlePublish}
              disabled={saving || memory.status === 'published'}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              公開
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>基本情報</CardTitle>
                <CardDescription>
                  想い出のタイトルと説明を設定してください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    タイトル
                  </label>
                  <Input
                    value={memory.title}
                    onChange={(e) => setMemory({ ...memory, title: e.target.value })}
                    placeholder="想い出のタイトルを入力"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    説明
                  </label>
                  <textarea
                    value={memory.description || ''}
                    onChange={(e) => setMemory({ ...memory, description: e.target.value })}
                    placeholder="想い出の説明を入力"
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>メディア</CardTitle>
                <CardDescription>
                  画像、動画、音声をアップロードしてください
                </CardDescription>
              </CardHeader>
              <CardContent>
                {params.id === 'new' ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">
                      まず想い出を保存してからメディアをアップロードできます
                    </p>
                  </div>
                ) : (
                  <FileUpload 
                    memoryId={params.id} 
                    onUploadComplete={handleUploadComplete}
                  />
                )}
              </CardContent>
            </Card>

            {/* アップロード済みメディア一覧 */}
            {assets.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>アップロード済みメディア</CardTitle>
                  <CardDescription>
                    {assets.length}個のファイルがアップロードされています
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {assets.map((asset) => (
                      <div key={asset.id} className="border rounded-lg p-3">
                        {asset.type === 'image' ? (
                          <img 
                            src={asset.url} 
                            alt={asset.name}
                            className="w-full h-24 object-cover rounded mb-2"
                          />
                        ) : (
                          <div className="w-full h-24 bg-gray-100 rounded mb-2 flex items-center justify-center">
                            {asset.type === 'video' ? '🎥' : '🎵'}
                          </div>
                        )}
                        <p className="text-sm font-medium truncate">{asset.name}</p>
                        <p className="text-xs text-gray-500">
                          {(asset.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    タイプ
                  </label>
                  <select
                    value={memory.type}
                    onChange={(e) => setMemory({ ...memory, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="personal">個人</option>
                    <option value="family">家族</option>
                    <option value="business">ビジネス</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ステータス
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      memory.status === 'published' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {memory.status === 'published' ? '公開済み' : '下書き'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>プレビュー</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">
                    プレビュー機能は開発中です
                  </p>
                  <Button variant="outline" disabled>
                    プレビュー表示
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
