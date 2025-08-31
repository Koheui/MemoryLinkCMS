'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Memory, Block, Asset, Album } from '@/types';

interface MemoryPreviewProps {
  memory: Memory;
  blocks: Block[];
  assets: Asset[];
  albums: Album[];
  onClose: () => void;
}

export function MemoryPreview({ memory, blocks, assets, albums, onClose }: MemoryPreviewProps) {
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const sortedBlocks = blocks.sort((a, b) => a.order - b.order);

  const renderBlock = (block: Block) => {
    if (block.visibility === 'private') return null;

    const getFontSize = (size?: string) => {
      switch (size) {
        case 'small': return 'text-sm';
        case 'large': return 'text-lg';
        default: return 'text-base';
      }
    };

    const getTextAlign = (align?: string) => {
      switch (align) {
        case 'center': return 'text-center';
        case 'right': return 'text-right';
        default: return 'text-left';
      }
    };

    switch (block.type) {
      case 'text':
        return (
          <div 
            key={block.id}
            className={`mb-4 ${getFontSize(block.content.style?.fontSize)} ${getTextAlign(block.content.style?.textAlign)}`}
            style={{
              color: block.content.style?.color,
              backgroundColor: block.content.style?.backgroundColor,
            }}
          >
            {block.content.text}
          </div>
        );

      case 'image':
        return (
          <div key={block.id} className="mb-4">
            {block.content.images?.map((imageUrl, index) => (
              <img
                key={index}
                src={imageUrl}
                alt=""
                className="w-full rounded-lg mb-2"
              />
            ))}
          </div>
        );

      case 'video':
        if (!block.content.video) return null;
        return (
          <div key={block.id} className="mb-4">
            <video
              src={block.content.video}
              controls
              className="w-full rounded-lg"
              onPlay={() => setPlayingVideo(block.content.video)}
              onPause={() => setPlayingVideo(null)}
            />
          </div>
        );

      case 'album':
        if (!block.content.albumId) return null;
        const album = albums.find(a => a.id === block.content.albumId);
        if (!album) return null;

        return (
          <div key={block.id} className="mb-4">
            <div className="bg-gray-50 rounded-lg p-4 mb-3">
              <h3 className="font-medium text-lg mb-1">{album.title}</h3>
              {album.description && (
                <p className="text-gray-600 text-sm">{album.description}</p>
              )}
            </div>
            
            {album.layout === 'grid' && (
              <div className="grid grid-cols-2 gap-2">
                {album.assets.slice(0, 4).map((assetId) => {
                  const asset = assets.find(a => a.id === assetId);
                  if (!asset) return null;
                  
                  return (
                    <div key={assetId} className="aspect-square rounded-lg overflow-hidden">
                      {asset.type === 'image' ? (
                        <img
                          src={asset.url}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <Play className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {album.layout === 'carousel' && (
              <div className="relative">
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {album.assets.map((assetId) => {
                    const asset = assets.find(a => a.id === assetId);
                    if (!asset) return null;
                    
                    return (
                      <div key={assetId} className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden">
                        {asset.type === 'image' ? (
                          <img
                            src={asset.url}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <Play className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                    );
                  })}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">プレビュー</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* プレビューコンテンツ */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* カバー画像 */}
          {memory.coverImage && (
            <div className="mb-4">
              <img
                src={memory.coverImage}
                alt="カバー画像"
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}

          {/* タイトル */}
          <h1 className="text-2xl font-bold mb-2">{memory.title}</h1>
          
          {/* 説明 */}
          {memory.description && (
            <p className="text-gray-600 mb-6">{memory.description}</p>
          )}

          {/* ブロックコンテンツ */}
          <div className="space-y-4">
            {sortedBlocks.map(renderBlock)}
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>タイプ: {memory.type === 'personal' ? '個人' : memory.type === 'family' ? '家族' : 'ビジネス'}</span>
            <span>ステータス: {memory.status === 'published' ? '公開済み' : '下書き'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
