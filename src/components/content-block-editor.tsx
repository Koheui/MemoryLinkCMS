'use client';

import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Block } from '@/types';

interface ContentBlockEditorProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onDelete: (blockId: string) => void;
  memoryId: string;
}

export default function ContentBlockEditor({
  block,
  onUpdate,
  onDelete,
  memoryId
}: ContentBlockEditorProps) {
  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          {block.type === 'text' ? 'テキスト' : 
           block.type === 'image' ? '画像' : 
           block.type === 'video' ? '動画' : 
           block.type === 'audio' ? '音声' : 'アルバム'}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(block.id)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="text-gray-600">
        {block.type === 'text' && (
          <div>
            {typeof block.content === 'string' ? block.content : block.content.text || 'テキストコンテンツ'}
          </div>
        )}
        {block.type === 'image' && (
          <div>
            {typeof block.content === 'string' ? block.content : block.content.url || '画像コンテンツ'}
          </div>
        )}
        {block.type === 'video' && (
          <div>動画コンテンツ</div>
        )}
        {block.type === 'audio' && (
          <div>音声コンテンツ</div>
        )}
        {block.type === 'album' && (
          <div>アルバムコンテンツ</div>
        )}
      </div>
    </div>
  );
}
