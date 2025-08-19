// src/components/block-editor.tsx
'use client';

import type { Memory, Asset, PublicPageBlock } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { db } from '@/lib/firebase/client';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { PlusCircle, GripVertical, Image as ImageIcon, Video, Mic, Type, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface BlockEditorProps {
  memory: Memory;
  assets: Asset[];
}

const blockIcons = {
  album: <ImageIcon className="h-5 w-5" />,
  video: <Video className="h-5 w-5" />,
  audio: <Mic className="h-5 w-5" />,
  text: <Type className="h-5 w-5" />,
};

export function BlockEditor({ memory, assets }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<PublicPageBlock[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const blocksCollectionRef = collection(db, 'memories', memory.id, 'blocks');
    const q = query(blocksCollectionRef, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBlocks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PublicPageBlock[];
      setBlocks(fetchedBlocks);
    });

    return () => unsubscribe();
  }, [memory.id]);

  const addBlock = async (type: PublicPageBlock['type']) => {
    try {
        const blocksCollectionRef = collection(db, 'memories', memory.id, 'blocks');
        const newBlockData: Omit<PublicPageBlock, 'id' | 'createdAt' | 'updatedAt'> = {
            type,
            order: blocks.length,
            visibility: 'show',
            title: `新しい${type}ブロック`,
            ...(type === 'album' && { album: { layout: 'grid', assetIds: [] } }),
            ...(type === 'video' && { video: { assetId: '' } }),
            ...(type === 'audio' && { audio: { assetId: '' } }),
            ...(type === 'text' && { text: { content: '' } }),
        };

        await addDoc(blocksCollectionRef, {
            ...newBlockData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        
        toast({ title: 'ブロックを追加しました', description: `新しい${type}ブロックが作成されました。` });
    } catch (error) {
        console.error("Error adding block: ", error);
        toast({ variant: 'destructive', title: 'エラー', description: 'ブロックの追加に失敗しました。' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {blocks.map((block) => (
          <Card key={block.id} className="flex items-center p-4">
             <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab mr-4" />
             <div className="flex-shrink-0 mr-4 text-muted-foreground">{blockIcons[block.type]}</div>
             <div className="flex-grow">
                <p className="font-semibold">{block.title}</p>
                <p className="text-sm text-muted-foreground capitalize">{block.type}</p>
             </div>
             <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
             </Button>
          </Card>
        ))}
      </div>
      
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