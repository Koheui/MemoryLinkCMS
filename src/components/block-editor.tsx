
// src/components/block-editor.tsx
'use client';

import * as React from 'react';
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
    DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '@/lib/firebase/client';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { PlusCircle, GripVertical, Image as ImageIcon, Video, Mic, Type, Trash2, Loader2, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MediaUploader } from './media-uploader';


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

function EditBlockDialog({ open, onOpenChange, block, assets, memoryId }: { open: boolean, onOpenChange: (open: boolean) => void, block: PublicPageBlock, assets: Asset[], memoryId: string }) {
    const [title, setTitle] = useState(block.title || '');
    const [textContent, setTextContent] = useState(block.text?.content || '');
    const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(block.album?.assetIds || []);
    const [selectedVideoId, setSelectedVideoId] = useState(block.video?.assetId || '');
    const [selectedAudioId, setSelectedAudioId] = useState(block.audio?.assetId || '');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    // Reset state when block changes
    useEffect(() => {
        setTitle(block.title || '');
        setTextContent(block.text?.content || '');
        setSelectedAssetIds(block.album?.assetIds || []);
        setSelectedVideoId(block.video?.assetId || '');
        setSelectedAudioId(block.audio?.assetId || '');
    }, [block]);


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
            onOpenChange(false); // Close dialog on success
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
      <Dialog open={open} onOpenChange={onOpenChange}>
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

                <div className="grid grid-cols-4 items-start gap-4">
                   <Label className="text-right pt-2">メディア追加</Label>
                   <div className="col-span-3 flex gap-2">
                     <MediaUploader type="image" accept="image/*" memoryId={memoryId} onUploadSuccess={() => {}}>
                       <Button variant="outline" size="sm"><ImageIcon className="mr-2 h-4 w-4"/>写真</Button>
                     </MediaUploader>
                      <MediaUploader type="video" accept="video/*" memoryId={memoryId} onUploadSuccess={() => {}}>
                       <Button variant="outline" size="sm"><Video className="mr-2 h-4 w-4"/>動画</Button>
                     </MediaUploader>
                      <MediaUploader type="audio" accept="audio/*" memoryId={memoryId} onUploadSuccess={() => {}}>
                       <Button variant="outline" size="sm"><Mic className="mr-2 h-4 w-4"/>音声</Button>
                     </MediaUploader>
                   </div>
                </div>

            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    変更を保存
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    )
}

function SortableBlockItem({ block, onEdit, onDelete }: { block: PublicPageBlock, onEdit: () => void, onDelete: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({id: block.id});
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center p-2 rounded-lg border bg-card transition-colors">
            <button {...attributes} {...listeners} className="p-1 cursor-grab focus:outline-none">
                 <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </button>
             <div onClick={onEdit} className="flex-grow flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-md p-2 -m-2 ml-1">
                <div className="flex-shrink-0">{blockIcons[block.type]}</div>
                <div className="flex-grow">
                    <p className="font-medium">{block.title}</p>
                    <p className="text-sm text-muted-foreground capitalize">{block.type}</p>
                </div>
            </div>
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
                  <AlertDialogAction onClick={onDelete}>削除</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export function BlockEditor({ memory, assets }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<PublicPageBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [editingBlock, setEditingBlock] = useState<PublicPageBlock | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  async function handleDragEnd(event: DragEndEvent) {
    const {active, over} = event;
    
    if (active.id !== over?.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);

        // Update order in Firestore
        const batch = writeBatch(db);
        newItems.forEach((item, index) => {
            const blockRef = doc(db, 'memories', memory.id, 'blocks', item.id);
            batch.update(blockRef, { order: index });
        });
        
        batch.commit().catch(error => {
            console.error("Failed to reorder blocks:", error);
            toast({ variant: 'destructive', title: 'エラー', description: 'ブロックの並び替えに失敗しました。' });
            // Optionally revert local state change
        });

        return newItems;
      });
    }
  }

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

        const newDoc = await addDoc(blocksCollectionRef, {
            ...newBlockData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        
        toast({ title: 'ブロックを追加しました', description: `新しいブロックが作成されました。` });
        
        // Open the edit dialog for the new block immediately
        setEditingBlock({ id: newDoc.id, ...newBlockData } as PublicPageBlock);

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
       {editingBlock && (
            <EditBlockDialog
                open={!!editingBlock}
                onOpenChange={(open) => !open && setEditingBlock(null)}
                block={editingBlock}
                assets={assets}
                memoryId={memory.id}
            />
        )}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={blocks}
          strategy={verticalListSortingStrategy}
        >
            <div className="space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : blocks.length > 0 ? (
                    blocks.map((block) => (
                        <SortableBlockItem 
                            key={block.id}
                            block={block}
                            onEdit={() => setEditingBlock(block)}
                            onDelete={() => deleteBlock(block.id)}
                        />
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
        </SortableContext>
      </DndContext>
      
      <div className="mt-6">
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
