// src/components/block-editor.tsx
'use client';

import type { Memory, Asset, PublicPageBlock } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, GripVertical } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BlockEditorProps {
  memory: Memory;
  assets: Asset[];
}

export function BlockEditor({ memory, assets }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<PublicPageBlock[]>([]);

  const addBlock = (type: PublicPageBlock['type']) => {
    // This is a placeholder. In the next step, we'll implement the actual logic
    // to add a block to Firestore and update the local state.
    console.log(`Adding block of type: ${type}`);
  };

  return (
    <div className="space-y-4">
      {/* This will be the list of blocks. We'll build this out next. */}
      {blocks.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <h3 className="text-sm font-semibold text-muted-foreground">
            コンテンツがありません
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            下のボタンから最初のブロックを追加してください。
          </p>
        </div>
      )}

      {/* Block list will go here */}

      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" />
              ブロックを追加
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => addBlock('album')}>
              写真アルバム
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addBlock('video')}>
              動画
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addBlock('audio')}>
              音声
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addBlock('text')}>
              テキスト
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
