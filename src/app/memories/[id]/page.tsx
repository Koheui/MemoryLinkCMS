'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Eye, ArrowLeft, Image, Upload, Video, Music, Clock, Globe } from 'lucide-react';
import { Memory, Asset, Album, Block } from '@/types';
import { useMemory, useCreateMemory, useUpdateMemory, useAlbumsByMemory } from '@/hooks/use-memories';
import { AlbumCreator } from '@/components/album-creator';
import { ContentBlockEditor } from '@/components/content-block-editor';
import { AddBlockButton } from '@/components/add-block-button';
import { MemoryPreview } from '@/components/memory-preview';
import { DraggableContentContainer } from '@/components/draggable-content-container';
import { DraggableContentBlock } from '@/components/draggable-content-block';
import { ContentUploadModal } from '@/components/content-upload-modal';
import { HeaderSettings } from '@/components/header-settings';
import { getAssetsByMemory } from '@/lib/firestore';
import { formatFileSize } from '@/lib/utils';
import { getTenantFromOrigin } from '@/lib/security/tenant-validation';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function MemoryEditPage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [coverImage, setCoverImage] = useState<string>('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showCoverUploadModal, setShowCoverUploadModal] = useState(false);
  const [tempMemoryId, setTempMemoryId] = useState<string>('');
  const [publicPageId, setPublicPageId] = useState<string | null>(null);

  const { data: existingMemory, isLoading: memoryLoading } = useMemory(params.id === 'new' ? '' : params.id);
  const { data: albums = [] } = useAlbumsByMemory(params.id === 'new' ? '' : params.id);
  const createMemoryMutation = useCreateMemory();
  const updateMemoryMutation = useUpdateMemory();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (params.id === 'new') {
      // 新規作成
      const newTempId = `temp-${Date.now()}`;
      setTempMemoryId(newTempId);
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
      setCoverImage(existingMemory.coverImage || '');
      
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
      const memoryToSave = {
        ...memory,
        coverImage: coverImage,
      };

      if (params.id === 'new') {
        // 新規作成
        const { id, createdAt, updatedAt, ...memoryData } = memoryToSave;
        const newMemory = await createMemoryMutation.mutateAsync(memoryData);
        router.push(`/memories/${newMemory.id}`);
      } else {
        // 更新
        await updateMemoryMutation.mutateAsync(memoryToSave);
      }
    } catch (error) {
      console.error('Error saving memory:', error);
      alert('保存に失敗しました。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!memory || !user) return;
    
    setPublishing(true);
    try {
      // テナント情報を取得
      const origin = window.location.origin;
      const tenantInfo = getTenantFromOrigin(origin);
      
      // 公開ページを作成
      const publicPageRef = await addDoc(collection(db, 'publicPages'), {
        tenant: tenantInfo.tenant,
        memoryId: memory.id,
        title: memory.title,
        about: memory.description,
        design: {
          theme: memory.design.theme || 'default',
          fontScale: 1.0,
          colors: memory.design.colors ? Object.values(memory.design.colors) : ['#3B82F6', '#EF4444']
        },
        media: {
          images: assets.filter(a => a.type === 'image').map(a => a.url),
          videos: assets.filter(a => a.type === 'video').map(a => a.url),
          audio: assets.filter(a => a.type === 'audio').map(a => a.url)
        },
        ordering: blocks.map(b => b.id),
        publish: {
          status: 'published',
          version: 1,
          publishedAt: new Date()
        },
        access: {
          mode: 'public'
        },
        createdAt: new Date()
      });
      
      // メモリを更新
      const memoryRef = doc(db, 'memories', memory.id);
      await updateDoc(memoryRef, {
        status: 'published',
        publicPageId: publicPageRef.id,
        updatedAt: new Date()
      });
      
      setPublicPageId(publicPageRef.id);
      setMemory(prev => prev ? { ...prev, status: 'published', publicPageId: publicPageRef.id } : null);
      
      console.log('Memory published:', publicPageRef.id);
    } catch (error) {
      console.error('Error publishing memory:', error);
    } finally {
      setPublishing(false);
    }
  };

  const handleViewPublicPage = () => {
    if (publicPageId) {
      window.open(`/public/${publicPageId}`, '_blank');
    }
  };

  const handleBlocksReorder = (reorderedBlocks: Block[]) => {
    setBlocks(reorderedBlocks);
  };

  const handleUploadComplete = (asset: Asset) => {
    setAssets(prev => [...prev, asset]);
  };

  const handleCoverImageUploadComplete = (asset: Asset) => {
    setCoverImage(asset.url);
    setAssets(prev => [...prev, asset]);
    setShowCoverUploadModal(false);
  };

  const handleTitleChange = (title: string) => {
    setMemory(prev => prev ? { ...prev, title } : null);
  };

  const handleDescriptionChange = (description: string) => {
    setMemory(prev => prev ? { ...prev, description } : null);
  };

  const handleHeaderStyleChange = (headerStyle: any) => {
    setMemory(prev => prev ? {
      ...prev,
      design: {
        ...prev.design,
        header: headerStyle,
      },
    } : null);
  };

  const handleCoverImageSelect = (imageUrl: string) => {
    setCoverImage(imageUrl);
  };

  const handleAlbumCreated = (album: Album) => {
    // アルバムが作成された時の処理
    console.log('Album created:', album);
  };

  const handleAddBlock = (type: 'text' | 'image' | 'video' | 'album') => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type,
      order: blocks.length,
      visibility: 'public',
      content: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setBlocks(prev => [...prev, newBlock]);
  };

    const handleUpdateBlock = (updatedBlock: Block) => {
    setBlocks(prev => prev.map(block =>
      block.id === updatedBlock.id ? updatedBlock : block
    ));
  };

  const handleDeleteBlock = (blockId: string) => {
    setBlocks(prev => prev.filter(block => block.id !== blockId));
  };

  const handlePublish = async () => {
    if (!memory || !user) return;
    
    setPublishing(true);
    try {
      // テナント情報を取得
      const origin = window.location.origin;
      const tenantInfo = getTenantFromOrigin(origin);
      
      // 公開ページを作成
      const publicPageRef = await addDoc(collection(db, 'publicPages'), {
        tenant: tenantInfo.tenant,
        memoryId: memory.id,
        title: memory.title,
        about: memory.description,
        design: {
          theme: memory.design.theme || 'default',
          fontScale: 1.0,
          colors: memory.design.colors ? Object.values(memory.design.colors) : ['#3B82F6', '#EF4444']
        },
        media: {
          images: assets.filter(a => a.type === 'image').map(a => a.url),
          videos: assets.filter(a => a.type === 'video').map(a => a.url),
          audio: assets.filter(a => a.type === 'audio').map(a => a.url)
        },
        ordering: blocks.map(b => b.id),
        publish: {
          status: 'published',
          version: 1,
          publishedAt: new Date()
        },
        access: {
          mode: 'public'
        },
        createdAt: new Date()
      });
      
      // メモリを更新
      const memoryRef = doc(db, 'memories', memory.id);
      await updateDoc(memoryRef, {
        status: 'published',
        publicPageId: publicPageRef.id,
        updatedAt: new Date()
      });
      
      setPublicPageId(publicPageRef.id);
      setMemory(prev => prev ? { ...prev, status: 'published', publicPageId: publicPageRef.id } : null);
      
      console.log('Memory published:', publicPageRef.id);
    } catch (error) {
      console.error('Error publishing memory:', error);
    } finally {
      setPublishing(false);
    }
  };

  const handleViewPublicPage = () => {
    if (publicPageId) {
      window.open(`/public/${publicPageId}`, '_blank');
    }
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
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <div className="sticky top-0 z-40 bg-white border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">
                {params.id === 'new' ? '新しい想い出' : memory.title || '無題'}
              </h1>
              <p className="text-sm text-gray-500">
                {memory.status === 'published' ? '公開済み' : '下書き'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="w-4 h-4 mr-1" />
              プレビュー
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              保存
            </Button>
            {memory.status === 'draft' && (
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={publishing}
                className="bg-green-600 hover:bg-green-700"
              >
                {publishing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4 mr-1" />
                )}
                公開
              </Button>
            )}
            {memory.status === 'published' && publicPageId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewPublicPage}
              >
                <Globe className="w-4 h-4 mr-1" />
                公開ページを見る
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="px-4 py-6 max-w-2xl mx-auto">
                      {/* カバー写真 */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  {coverImage ? (
                    <div className="relative group">
                      <img
                        src={coverImage}
                        alt="カバー写真"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setCoverImage('')}
                      >
                        削除
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 mb-3">
                        カバー写真をアップロードしてください
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setShowCoverUploadModal(true)}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        カバー写真をアップロード
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

                      {/* ヘッダー設定 */}
              <HeaderSettings
                title={memory.title}
                description={memory.description || ''}
                headerStyle={memory.design.header || {}}
                onTitleChange={handleTitleChange}
                onDescriptionChange={handleDescriptionChange}
                onStyleChange={handleHeaderStyleChange}
              />

                      {/* コンテンツブロック */}
              <DraggableContentContainer
                blocks={blocks}
                onBlocksReorder={handleBlocksReorder}
              >
                <div className="space-y-4">
                  {blocks.map((block) => (
                                         <DraggableContentBlock key={block.id} block={block}>
                       <ContentBlockEditor
                         block={block}
                         onUpdate={handleUpdateBlock}
                         onDelete={handleDeleteBlock}
                         assets={assets}
                         albums={albums}
                         memoryId={params.id === 'new' ? tempMemoryId : params.id}
                       />
                     </DraggableContentBlock>
                  ))}
                </div>
              </DraggableContentContainer>

        {/* ブロック追加ボタン */}
        <AddBlockButton onAddBlock={handleAddBlock} />



        {/* アルバム作成 */}
        {assets.length > 0 && (
          <div className="mt-6">
            <AlbumCreator
              memoryId={params.id}
              assets={assets}
              onAlbumCreated={handleAlbumCreated}
            />
          </div>
        )}

                      {/* カバー画像アップロードモーダル */}
              <ContentUploadModal
                isOpen={showCoverUploadModal}
                onClose={() => setShowCoverUploadModal(false)}
                onUploadComplete={handleCoverImageUploadComplete}
                memoryId={params.id === 'new' ? tempMemoryId : params.id}
                contentType="image"
              />

              {/* プレビュー */}
              {showPreview && (
                <MemoryPreview
                  memory={memory}
                  blocks={blocks}
                  assets={assets}
                  albums={albums}
                  onClose={() => setShowPreview(false)}
                />
              )}
      </div>
    </div>
  );
}
