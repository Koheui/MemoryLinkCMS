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
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '@/lib/firebase/client';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { PlusCircle, GripVertical, Image as ImageIcon, Video, Mic, Type, Trash2, Loader2, Save } from 'lucide-react';
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

function EditBlockDialog({ block, assets, memoryId }: { block: PublicPageBlock, assets: Asset[], memoryId: string }) {
    const [title, setTitle] = useState(block.title || '');
    const [textContent, setTextContent] = useState(block.text?.content || '');
    const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(block.album?.assetIds || []);
    const [selectedVideoId, setSelectedVideoId] = useState(block.video?.assetId || '');
    const [selectedAudioId, setSelectedAudioId] = useState(block.audio?.assetId || '');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        setIsSaving(true);
        const blockRef = doc(db, 'memories', memoryId, 'blocks', block.id);
        
        const updateData: any = {
            title,
            updatedAt: serverTimestamp(),
        };

        if (block.type === 'text') {
            updateData.text = { content: textContent };
        }
        if (block.type === 'album') {
            updateData.album = { ...block.album, assetIds: selectedAssetIds };
        }
        if (block.type === 'video') {
            updateData.video = { assetId: selectedVideoId };
        }
         if (block.type === 'audio') {
            updateData.audio = { assetId: selectedAudioId };
        }

        try {
            await updateDoc(blockRef, updateData);
            toast({ title: '成功', description: 'ブロックを更新しました。' });
        } catch (error) {
            console.error("Failed to update block:", error);
            toast({ variant: 'destructive', title: 'エラー', description: 'ブロックの更新に失敗しました。' });
        } finally {
            setIsSaving(false);
        }
    }
    
    const imageAssets = assets.filter(a => a.type === 'image');
    const videoAssets = assets.filter(a => a.type === 'video');
    const audioAssets = assets.filter(a => a.type === 'audio');

    return (
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle>ブロックを編集: {block.title}</DialogTitle>
                <DialogDescription>
                    ブロックのコンテンツと設定を変更します。
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">タイトル</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
                </div>

                {block.type === 'text' && (
                     <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="content" className="text-right pt-2">内容</Label>
                        <Textarea id="content" value={textContent} onChange={(e) => setTextContent(e.target.value)} className="col-span-3 min-h-[150px]" />
                    </div>
                )}
                
                {block.type === 'album' && (
                     <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">画像選択</Label>
                        <div className="col-span-3 grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                            {imageAssets.map(asset => (
                                <div key={asset.id} className="flex items-center space-x-2">
                                     <Checkbox
                                        id={`asset-${asset.id}`}
                                        checked={selectedAssetIds.includes(asset.id)}
                                        onCheckedChange={(checked) => {
                                            setSelectedAssetIds(prev => 
                                                checked ? [...prev, asset.id] : prev.filter(id => id !== asset.id)
                                            );
                                        }}
                                    />
                                    <label htmlFor={`asset-${asset.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 truncate" title={asset.name}>
                                        {asset.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {block.type === 'video' && (
                     <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">動画選択</Label>
                         <div className="col-span-3">
                            {videoAssets.map(asset => (
                                <div key={asset.id} className="flex items-center space-x-2">
                                     <input type="radio" id={`asset-${asset.id}`} name="video-asset" value={asset.id} checked={selectedVideoId === asset.id} onChange={(e) => setSelectedVideoId(e.target.value)} />
                                     <label htmlFor={`asset-${asset.id}`} className="text-sm font-medium leading-none truncate" title={asset.name}>
                                        {asset.name}
                                     </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                 {block.type === 'audio' && (
                     <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">音声選択</Label>
                        <div className="col-span-3">
                            {audioAssets.map(asset => (
                                <div key={asset.id} className="flex items-center space-x-2">
                                     <input type="radio" id={`asset-${asset.id}`} name="audio-asset" value={asset.id} checked={selectedAudioId === asset.id} onChange={(e) => setSelectedAudioId(e.target.value)} />
                                     <label htmlFor={`asset-${asset.id}`} className="text-sm font-medium leading-none truncate" title={asset.name}>
                                        {asset.name}
                                     </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">キャンセル</Button>
                </DialogClose>
                <DialogClose asChild>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        変更を保存
                    </Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    )
}


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
            ...(type === 'album' && { album: { layout: 'grid', cols: 2, assetIds: [] } }),
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
            <Dialog key={block.id}>
              <div className="flex items-center p-2 rounded-lg border bg-card transition-colors">
                 <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab mr-3 flex-shrink-0" />
                 <DialogTrigger asChild>
                    <div className="flex-grow flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-md p-2 -m-2">
                        <div className="flex-shrink-0">{blockIcons[block.type]}</div>
                        <div className="flex-grow">
                            <p className="font-medium">{block.title}</p>
                            <p className="text-sm text-muted-foreground capitalize">{block.type}</p>
                        </div>
                    </div>
                 </DialogTrigger>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-2">
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
              <EditBlockDialog block={block} assets={assets} memoryId={memory.id} />
            </Dialog>
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
