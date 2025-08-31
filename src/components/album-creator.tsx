'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Image, Video, Music, Plus, X, Grid, Layout, Play } from 'lucide-react';
import { Asset, Album } from '@/types';
import { useCreateAlbum } from '@/hooks/use-memories';

interface AlbumCreatorProps {
  memoryId: string;
  assets: Asset[];
  onAlbumCreated: (album: Album) => void;
}

export function AlbumCreator({ memoryId, assets, onAlbumCreated }: AlbumCreatorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [layout, setLayout] = useState<'grid' | 'masonry' | 'carousel'>('grid');
  
  const createAlbumMutation = useCreateAlbum();

  const imageAssets = assets.filter(asset => asset.type === 'image');
  const videoAssets = assets.filter(asset => asset.type === 'video');

  const handleAssetToggle = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleCreateAlbum = async () => {
    if (!title.trim() || selectedAssets.length === 0) {
      alert('タイトルとアセットを選択してください');
      return;
    }

    try {
      const albumData = {
        memoryId,
        ownerUid: 'mock-user-id',
        title: title.trim(),
        description: description.trim(),
        assets: selectedAssets,
        layout,
      };

      const newAlbum = await createAlbumMutation.mutateAsync(albumData);
      onAlbumCreated(newAlbum);
      
      // フォームをリセット
      setTitle('');
      setDescription('');
      setSelectedAssets([]);
      setLayout('grid');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create album:', error);
      alert('アルバムの作成に失敗しました');
    }
  };

  if (!isCreating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>アルバム作成</CardTitle>
          <CardDescription>
            複数の写真や動画を選択してアルバムを作成できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新しいアルバムを作成
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>新しいアルバムを作成</CardTitle>
            <CardDescription>
              アルバムのタイトルと説明を入力し、含めるメディアを選択してください
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 基本情報 */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              アルバムタイトル *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="アルバムのタイトルを入力"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="アルバムの説明を入力"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              レイアウト
            </label>
            <div className="flex space-x-2">
              <Button
                variant={layout === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLayout('grid')}
              >
                <Grid className="w-4 h-4 mr-1" />
                グリッド
              </Button>
              <Button
                variant={layout === 'masonry' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLayout('masonry')}
              >
                <Layout className="w-4 h-4 mr-1" />
                メーソンリー
              </Button>
              <Button
                variant={layout === 'carousel' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLayout('carousel')}
              >
                <Play className="w-4 h-4 mr-1" />
                カルーセル
              </Button>
            </div>
          </div>
        </div>

        {/* メディア選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            含めるメディア ({selectedAssets.length}個選択中)
          </label>
          
          {imageAssets.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                <Image className="w-4 h-4 mr-1" />
                画像 ({imageAssets.length}個)
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {imageAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedAssets.includes(asset.id)
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleAssetToggle(asset.id)}
                  >
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="w-full h-20 object-cover"
                    />
                    {selectedAssets.includes(asset.id) && (
                      <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {videoAssets.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                <Video className="w-4 h-4 mr-1" />
                動画 ({videoAssets.length}個)
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {videoAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedAssets.includes(asset.id)
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleAssetToggle(asset.id)}
                  >
                    {asset.thumbnailUrl ? (
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.name}
                        className="w-full h-20 object-cover"
                      />
                    ) : (
                      <div className="w-full h-20 bg-gray-100 flex items-center justify-center">
                        <Video className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    {selectedAssets.includes(asset.id) && (
                      <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {imageAssets.length === 0 && videoAssets.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Image className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>アルバムに含めるメディアがありません</p>
              <p className="text-sm">まずメディアをアップロードしてください</p>
            </div>
          )}
        </div>

        {/* アクション */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsCreating(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleCreateAlbum}
            disabled={!title.trim() || selectedAssets.length === 0 || createAlbumMutation.isPending}
          >
            {createAlbumMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                作成中...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                アルバムを作成
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
