// src/components/block-editor.tsx
'use client';

import type { Memory, Asset, PublicPageBlock } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { db } from '@/lib/firebase/client';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { PlusCircle, GripVertical, Image as ImageIcon, Video, Mic, Type, Trash2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface BlockEditorProps {
  memory: Memory;
  assets: Asset[];
}

const blockIcons: { [key in PublicPageBlock['type']]: React.ReactNode } = {
  album: <ImageIcon className="h-5 w-5 text-muted-foreground" />,
  video: <Video className="h-5 w-5 text-muted-foreground" />,
  audio: <Mic className="h-5 w-5 text-muted-foreground" />,
  text: <Type className="h-5 w-5 text-muted-foreground" />,
};

export function BlockEditor({ memory, assets }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<PublicPageBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const blocksCollectionRef = collection(db, 'memories', memory.id, 'blocks');
    const q = query(blocksCollectionRef, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBlocks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PublicPageBlock[];
      setBlocks(fetchedBlocks);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching blocks: ", error);
      toast({ variant: 'destructive', title: 'エラー', description: 'ブロックの読み込みに失敗しました。' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [memory.id, toast]);

  const addBlock = async (type: PublicPageBlock['type']) => {
    try {
        const blocksCollectionRef = collection(db, 'memories', memory.id, 'blocks');
        const newBlockData: Omit<PublicPageBlock, 'id' | 'createdAt' | 'updatedAt'> = {
            type,
            order: blocks.length,
            visibility: 'show',
            title: `新しい ${type === 'album' ? 'アルバム' : type === 'video' ? '動画' : type === 'audio' ? '音声' : 'テキスト'}`,
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
        
        toast({ title: 'ブロックを追加しました', description: `新しいブロックが作成されました。` });
    } catch (error) {
        console.error("Error adding block: ", error);
        toast({ variant: 'destructive', title: 'エラー', description: 'ブロックの追加に失敗しました。' });
    }
  };

  const deleteBlock = async (blockId: string) => {
    try {
        const blockRef = doc(db, 'memories', memory.id, 'blocks', blockId);
        await deleteDoc(blockRef);
        toast({ title: 'ブロックを削除しました' });
    } catch (error) {
        console.error("Error deleting block: ", error);
        toast({ variant: 'destructive', title: 'エラー', description: 'ブロックの削除に失敗しました。' });
    }
  }


  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {loading ? (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : blocks.length > 0 ? (
            blocks.map((block) => (
              <div key={block.id} className="flex items-center p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                 <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab mr-3 flex-shrink-0" />
                 <div className="mr-4 flex-shrink-0">{blockIcons[block.type]}</div>
                 <div className="flex-grow">
                    <p className="font-medium">{block.title}</p>
                    <p className="text-sm text-muted-foreground capitalize">{block.type}</p>
                 </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        このブロック「{block.title}」を削除します。この操作は元に戻すことはできません。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteBlock(block.id)}>削除</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))
        ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <h3 className="text-sm font-semibold text-muted-foreground">
                コンテンツがありません
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                下のボタンから最初のブロックを追加してください。
              </p>
            </div>
        )}
      </div>
      
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
                <ImageIcon className="mr-2 h-4 w-4" /> 写真アルバム
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addBlock('video')}>
                <Video className="mr-2 h-4 w-4" /> 動画
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addBlock('audio')}>
                <Mic className="mr-2 h-4 w-4" /> 音声
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addBlock('text')}>
                <Type className="mr-2 h-4 w-4" /> テキスト
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
