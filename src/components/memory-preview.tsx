'use client';

import { Block } from '@/types';

interface MemoryPreviewProps {
  blocks: Block[];
}

export default function MemoryPreview({ blocks }: MemoryPreviewProps) {
  const renderBlock = (block: Block) => {
    switch (block.type) {
      case 'text':
        return (
          <div key={block.id} className="mb-4">
            <p className="text-gray-800">
              {typeof block.content === 'string' ? block.content : block.content.text || 'テキストコンテンツ'}
            </p>
          </div>
        );

      case 'image':
        return (
          <div key={block.id} className="mb-4">
            <p className="text-gray-600">画像コンテンツ</p>
          </div>
        );

      case 'video':
        return (
          <div key={block.id} className="mb-4">
            <p className="text-gray-600">動画コンテンツ</p>
          </div>
        );

      case 'audio':
        return (
          <div key={block.id} className="mb-4">
            <p className="text-gray-600">音声コンテンツ</p>
          </div>
        );

      case 'album':
        return (
          <div key={block.id} className="mb-4">
            <p className="text-gray-600">アルバムコンテンツ</p>
          </div>
        );

      default:
        return (
          <div key={block.id} className="mb-4">
            <p className="text-gray-600">未対応のコンテンツ</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {blocks.map(renderBlock)}
    </div>
  );
}
