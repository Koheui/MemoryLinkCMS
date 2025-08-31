'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  Trash2, 
  Type, 
  Image, 
  Video, 
  Music, 
  Album,
  Eye,
  EyeOff,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus
} from 'lucide-react';
import { Block, Asset } from '@/types';
import { ContentUploadModal } from './content-upload-modal';

interface ContentBlockEditorProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onDelete: (blockId: string) => void;
  assets: any[];
  albums: any[];
  memoryId: string;
}

export function ContentBlockEditor({ 
  block, 
  onUpdate, 
  onDelete,
  assets,
  albums,
  memoryId
}: ContentBlockEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleContentChange = (field: string, value: any) => {
    onUpdate({
      ...block,
      content: {
        ...block.content,
        [field]: value,
      },
    });
  };

  const handleStyleChange = (field: string, value: any) => {
    onUpdate({
      ...block,
      content: {
        ...block.content,
        style: {
          ...block.content.style,
          [field]: value,
        },
      },
    });
  };

  const handleUploadComplete = (asset: Asset) => {
    // アップロード完了時の処理
    console.log('Upload completed:', asset);
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case 'text':
        return (
          <div className="space-y-3">
            <Textarea
              value={block.content.text || ''}
              onChange={(e) => handleContentChange('text', e.target.value)}
              placeholder="メッセージを入力してください..."
              className="min-h-[120px] resize-none border-0 focus:ring-0 text-base"
            />
            
            {/* テキストスタイル */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStylePanel(!showStylePanel)}
              >
                <Palette className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant={block.content.style?.textAlign === 'left' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleStyleChange('textAlign', 'left')}
                >
                  <AlignLeft className="w-3 h-3" />
                </Button>
                <Button
                  variant={block.content.style?.textAlign === 'center' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleStyleChange('textAlign', 'center')}
                >
                  <AlignCenter className="w-3 h-3" />
                </Button>
                <Button
                  variant={block.content.style?.textAlign === 'right' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleStyleChange('textAlign', 'right')}
                >
                  <AlignRight className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {showStylePanel && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">フォントサイズ:</span>
                  <div className="flex space-x-1">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                      <Button
                        key={size}
                        variant={block.content.style?.fontSize === size ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStyleChange('fontSize', size)}
                      >
                        {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'image':
        return (
          <div className="space-y-3">
            {block.content.images && block.content.images.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {block.content.images.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt=""
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg" />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-1 right-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        const newImages = block.content.images?.filter((_, i) => i !== index) || [];
                        handleContentChange('images', newImages);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-3">画像が選択されていません</p>
                <Button
                  variant="outline"
                  onClick={() => setShowUploadModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  画像を追加
                </Button>
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-3">
            {block.content.video ? (
              <div className="relative group">
                <div className="relative">
                  <video
                    src={block.content.video}
                    className="w-full h-32 object-cover rounded-lg"
                    muted
                    onLoadedMetadata={(e) => {
                      // サムネイル表示のため、最初のフレームを表示
                      const video = e.target as HTMLVideoElement;
                      video.currentTime = 0;
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleContentChange('video', '')}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-3">動画が選択されていません</p>
                <Button
                  variant="outline"
                  onClick={() => setShowUploadModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  動画を追加
                </Button>
              </div>
            )}
          </div>
        );

      case 'album':
        return (
          <div className="space-y-3">
            {block.content.albumId ? (
              <div className="relative group">
                <div className="border-2 border-gray-200 rounded-lg p-4">
                  {(() => {
                    const selectedAlbum = albums.find(a => a.id === block.content.albumId);
                    if (!selectedAlbum) return null;
                    
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Album className="w-6 h-6 text-gray-400" />
                            <div>
                              <h4 className="font-medium">{selectedAlbum.title}</h4>
                              <p className="text-sm text-gray-500">{selectedAlbum.assets.length}個のメディア</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* アルバムのサムネイル表示 */}
                        <div className="grid grid-cols-3 gap-2">
                          {selectedAlbum.assets.slice(0, 6).map((assetId, index) => {
                            const asset = assets.find(a => a.id === assetId);
                            if (!asset) return null;
                            
                            return (
                              <div key={assetId} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                                {asset.type === 'image' ? (
                                  <img
                                    src={asset.url}
                                    alt={asset.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Video className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                                {index === 5 && selectedAlbum.assets.length > 6 && (
                                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">
                                      +{selectedAlbum.assets.length - 6}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleContentChange('albumId', '')}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Album className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-3">アルバムが選択されていません</p>
                <div className="grid gap-2">
                  {albums.map((album) => (
                    <div
                      key={album.id}
                      className="relative cursor-pointer rounded-lg border-2 p-3 transition-all hover:border-gray-300"
                      onClick={() => handleContentChange('albumId', album.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <Album className="w-6 h-6 text-gray-400" />
                        <div>
                          <h4 className="font-medium text-sm">{album.title}</h4>
                          <p className="text-xs text-gray-500">{album.assets.length}個のメディア</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
              <Card className="mb-4">
          <CardContent className="p-4">
            {/* ブロックヘッダー */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-1">
                {block.type === 'text' && <Type className="w-4 h-4" />}
                {block.type === 'image' && <Image className="w-4 h-4" />}
                {block.type === 'video' && <Video className="w-4 h-4" />}
                {block.type === 'album' && <Album className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {block.type === 'text' ? 'テキスト' :
                   block.type === 'image' ? '画像' :
                   block.type === 'video' ? '動画' :
                   block.type === 'album' ? 'アルバム' : 'ブロック'}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                {/* 可視性切り替え */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUpdate({
                    ...block,
                    visibility: block.visibility === 'public' ? 'private' : 'public'
                  })}
                >
                  {block.visibility === 'public' ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </Button>

                {/* 削除ボタン */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(block.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* ブロックコンテンツ */}
            <div className="space-y-3">
              {renderBlockContent()}
            </div>
          </CardContent>
        </Card>

      {/* アップロードモーダル */}
      <ContentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={handleUploadComplete}
        memoryId={memoryId}
        contentType={block.type === 'image' ? 'image' : block.type === 'video' ? 'video' : 'audio'}
      />
    </>
  );
}
