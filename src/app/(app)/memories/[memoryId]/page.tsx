
// src/app/(app)/memories/[memoryId]/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import type { Memory, PublicPageBlock, Asset } from '@/lib/types';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, Timestamp, updateDoc, serverTimestamp, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Eye, Loader2, PlusCircle, Edit, Image as ImageIcon, Trash2, GripVertical, Type as TypeIcon, Video as VideoIcon, Mic, Album, Clapperboard } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { AboutModal, CoverPhotoModal, BlockModal } from '@/components/edit-modals';
import { v4 as uuidv4 } from 'uuid';
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
import { apiClient } from '@/lib/api-client';


// This is the new Visual Editor Page
export default function MemoryEditorPage() {
  const params = useParams();
  const memoryId = params.memoryId as string;
  const { user, loading: authLoading } = useAuth();
  
  const [memory, setMemory] = useState<Memory | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // --- Modal States ---
  const [isCoverPhotoModalOpen, setIsCoverPhotoModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<PublicPageBlock | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<PublicPageBlock | null>(null);


  const blocks = useMemo(() => memory?.blocks || [], [memory]);

  // DND sensors
   const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  useEffect(() => {
    if (authLoading || !user || !memoryId) return;

    const memoryDocRef = doc(db, 'memories', memoryId);
    const unsubscribeMemory = onSnapshot(memoryDocRef, (memoryDocSnap) => {
        if (memoryDocSnap.exists() && memoryDocSnap.data()?.ownerUid === user.uid) {
            const memoryData = { 
                id: memoryDocSnap.id, 
                ...memoryDocSnap.data(),
                blocks: (memoryDocSnap.data().blocks || []).sort((a: PublicPageBlock, b: PublicPageBlock) => a.order - b.order)
            } as Memory;
            setMemory(memoryData);
        } else {
            console.error("Memory not found or access denied.");
            setMemory(null);
        }
        setLoading(false);
    });

    const assetsQuery = query(collection(db, 'assets'), where('ownerUid', '==', user.uid));
    const unsubscribeAssets = onSnapshot(assetsQuery, (assetsSnap) => {
        const fetchedAssets = assetsSnap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                ...data,
                createdAt: (data.createdAt as Timestamp)?.toDate() || new Date()
            } as Asset;
        });

        fetchedAssets.sort((a, b) => {
            const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return dateB - dateA;
        });
        setAssets(fetchedAssets);
    });
    
    return () => {
        unsubscribeMemory();
        unsubscribeAssets();
    };

  }, [memoryId, user, authLoading]);
  
  async function handleDragEnd(event: DragEndEvent) {
    const {active, over} = event;
    if (over && active.id !== over.id) {
        if (!memory) return;
        
        const oldIndex = blocks.findIndex((item) => item.id === active.id);
        const newIndex = blocks.findIndex((item) => item.id === over.id);
        const newBlocks = arrayMove(blocks, oldIndex, newIndex);

        const reorderedBlocks = newBlocks.map((block, index) => ({ ...block, order: index }));

        try {
            const memoryRef = doc(db, 'memories', memoryId);
            await updateDoc(memoryRef, { blocks: reorderedBlocks, updatedAt: serverTimestamp() });
            // No need for local state update, Firestore listener will handle it
        } catch (error) {
             console.error("Failed to reorder blocks:", error);
            toast({ variant: 'destructive', title: 'エラー', description: 'ブロックの並び替えに失敗しました。' });
        }
    }
  }

  const handleAddNewBlock = () => {
    setEditingBlock(null);
    setIsBlockModalOpen(true);
  }

  const handleEditBlock = (block: PublicPageBlock) => {
    setEditingBlock(block);
    setIsBlockModalOpen(true);
  };

  const handleAssetUpdate = (asset: Asset) => {
     // This function is called when a new asset is uploaded or an existing one is updated (e.g. thumbnail change).
     // We update the local state to ensure the UI reflects the change immediately, 
     // even before the Firestore listener might fire.
     setAssets(prevAssets => {
        const existingAssetIndex = prevAssets.findIndex(a => a.id === asset.id);
        if (existingAssetIndex > -1) {
            // Update existing asset
            const newAssets = [...prevAssets];
            newAssets[existingAssetIndex] = asset;
            return newAssets;
        } else {
            // Add new asset and re-sort
            const newAssets = [...prevAssets, asset];
            newAssets.sort((a, b) => {
                const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
                const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
                return dateB - dateA;
            });
            return newAssets;
        }
    });
  };
  
  const handleSaveBlock = async (newBlockData: Omit<PublicPageBlock, 'id' | 'createdAt' | 'updatedAt' | 'order'>, blockToEdit?: PublicPageBlock | null) => {
      if (!memory) return;
      const memoryRef = doc(db, 'memories', memory.id);

      try {
        let updatedBlocks;
        if (blockToEdit) { 
            updatedBlocks = blocks.map(b => 
                b.id === blockToEdit.id ? { ...b, ...newBlockData, updatedAt: Timestamp.now() } : b
            );
        } else { 
            const newBlock: PublicPageBlock = {
                ...newBlockData,
                id: uuidv4(),
                order: blocks.length,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };
            updatedBlocks = [...blocks, newBlock];
        }
        
        const reorderedBlocks = updatedBlocks.map((block, index) => ({ ...block, order: index }));

        await updateDoc(memoryRef, { blocks: reorderedBlocks, updatedAt: serverTimestamp() });
        toast({ title: "成功", description: blockToEdit ? "ブロックを更新しました。" : "新しいブロックを追加しました。" });

      } catch (error) {
        console.error('Error saving block:', error);
        toast({ variant: 'destructive', title: 'エラー', description: 'ブロックの保存に失敗しました。' });
      }
  };

  const handleAboutSave = (data: { title: string, description: string, profileAssetId: string | null }) => {
    if (!memory) return;
    // Local update is handled by Firestore listener
  };
  
  const handleCoverPhotoSave = (data: { coverAssetId: string | null }) => {
      if(!memory) return;
       // Local update is handled by Firestore listener
  }
  
  const handleDeleteBlockConfirmed = async () => {
    if (!blockToDelete || !memory) return;

    try {
        const memoryRef = doc(db, 'memories', memoryId);
        const updatedBlocks = memory.blocks.filter(b => b.id !== blockToDelete.id)
            .map((b, index) => ({...b, order: index})); // Re-order remaining

        await updateDoc(memoryRef, { blocks: updatedBlocks, updatedAt: serverTimestamp() });

        toast({ title: '成功', description: 'ブロックを削除しました。' });
    } catch (error: any) {
        console.error('Failed to delete block:', error);
        toast({
            variant: 'destructive',
            title: 'エラー',
            description: `ブロックの削除中にエラーが発生しました: ${'' + error.message}`,
        });
    } finally {
        setBlockToDelete(null);
    }
  };

  const handlePreview = () => {
    if (!memory) return;

    const convertTimestamp = (timestamp: any): string | null => {
      if (!timestamp) return new Date().toISOString();
      if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toISOString();
      }
      if (typeof timestamp === 'string') {
        return timestamp; // Already a string
      }
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString();
      }
      try {
        return new Date(timestamp).toISOString();
      } catch (e) {
        return new Date().toISOString();
      }
    };
    
    // Create a serializable version of the data for localStorage
    const serializableMemory = {
      ...memory,
      createdAt: convertTimestamp(memory.createdAt),
      updatedAt: convertTimestamp(memory.updatedAt),
      blocks: undefined, // remove blocks from memory object to avoid duplication
    };
    
    const serializableBlocks = memory.blocks.map(block => ({
        ...block,
        createdAt: convertTimestamp(block.createdAt),
        updatedAt: convertTimestamp(block.updatedAt),
    }));

    const serializableAssets = assets.map(asset => ({
      ...asset,
      createdAt: convertTimestamp(asset.createdAt),
      updatedAt: convertTimestamp(asset.updatedAt),
    }));

    const previewData = {
        memory: serializableMemory,
        assets: serializableAssets,
        blocks: serializableBlocks,
    };
    
    localStorage.setItem('memory-preview', JSON.stringify(previewData));
    window.open(`/p/preview`, '_blank');
  };

  if (loading || authLoading) {
     return (
        <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
     )
  }

  if (!memory) {
     return notFound();
  }
  
  const coverImageUrl = memory.coverAssetId ? assets.find(a => a.id === memory.coverAssetId)?.url : null;
  const profileImageUrl = memory.profileAssetId ? assets.find(a => a.id === memory.profileAssetId)?.url : null;

  return (
    <div className="flex h-full flex-col bg-muted/30">
       {isCoverPhotoModalOpen && memory && (
        <CoverPhotoModal
            isOpen={isCoverPhotoModalOpen}
            setIsOpen={setIsCoverPhotoModalOpen}
            memory={memory}
            assets={assets}
            onUploadSuccess={handleAssetUpdate}
            onSave={handleCoverPhotoSave}
        />
       )}
       {isAboutModalOpen && memory && (
        <AboutModal
            isOpen={isAboutModalOpen}
            setIsOpen={setIsAboutModalOpen}
            memory={memory}
            assets={assets}
            onUploadSuccess={handleAssetUpdate}
            onSave={handleAboutSave}
        />
       )}
       {isBlockModalOpen && memory && (
        <BlockModal
            isOpen={isBlockModalOpen}
            setIsOpen={setIsBlockModalOpen}
            memory={memory}
            assets={assets}
            block={editingBlock}
            onSave={handleSaveBlock}
            onUploadSuccess={handleAssetUpdate}
        />
       )}
        <AlertDialog open={blockToDelete !== null} onOpenChange={(open) => !open && setBlockToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ブロックを削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                この操作は取り消せません。ブロック「{blockToDelete?.title || '無題'}」を完全に削除します。関連するメディアがある場合、それはライブラリに残りますが、このブロックからは削除されます。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteBlockConfirmed}>削除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 sm:px-6">
        <div>
           <h1 className="text-xl font-bold tracking-tight font-headline truncate max-w-[200px] sm:max-w-none">{memory.title}</h1>
           <p className="text-sm text-muted-foreground">ビジュアルエディタ</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePreview}>
              <Eye className="mr-2 h-4 w-4" />
              プレビュー
          </Button>
           <Button>
            公開する
          </Button>
        </div>
      </header>

      {/* Editor Canvas */}
       <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-2xl bg-background shadow-lg rounded-xl overflow-hidden">
                 {/* Cover and Profile Section */}
                 <div 
                     className="group relative aspect-[21/9] w-full overflow-hidden bg-muted flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-inner"
                     onClick={() => setIsCoverPhotoModalOpen(true)}
                 >
                     {coverImageUrl ? (
                         <Image src={coverImageUrl} alt="カバー画像" fill sizes="(max-width: 768px) 100vw, 896px" className="object-cover" />
                     ) : (
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                     )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <p className="text-white font-bold flex items-center gap-2"><Edit className="h-4 w-4" />カバー画像を編集</p>
                     </div>
                 </div>
                
                {/* Profile & About Section */}
                 <div className="relative -mt-20">
                    <div 
                       className="group relative h-32 w-32 sm:h-40 sm:w-40 mx-auto overflow-hidden rounded-full border-4 border-background bg-muted flex items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transition-shadow z-10"
                       onClick={() => setIsAboutModalOpen(true)}
                    >
                       {profileImageUrl ? (
                            <Image src={profileImageUrl} alt="プロフィール画像" fill sizes="160px" className="object-cover" />
                       ) : (
                           <ImageIcon className="h-10 w-10 text-muted-foreground" />
                       )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <p className="text-white font-bold text-center text-sm"><Edit className="h-4 w-4 mx-auto mb-1" />編集</p>
                       </div>
                   </div>

                   <div 
                       className="group relative pt-4 text-center px-4 cursor-pointer"
                       onClick={() => setIsAboutModalOpen(true)}
                   >
                        <div className="inline-block relative">
                           <h1 className="text-3xl font-bold sm:text-4xl">{memory.title}</h1>
                           <p className="mt-2 text-base text-muted-foreground max-w-prose">{memory.description || "紹介文を編集..."}</p>
                            <Button variant="outline" size="sm" className="absolute -top-2 -right-12 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Edit className="h-4 w-4"/>
                           </Button>
                       </div>
                   </div>
                </div>


                {/* Blocks Section */}
                <div className="mt-12 space-y-4 px-4 sm:px-6 pb-8">
                     <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext 
                            items={blocks}
                            strategy={verticalListSortingStrategy}
                        >
                             {blocks.map(block => (
                                <SortableBlockItem 
                                    key={block.id} 
                                    block={block}
                                    assets={assets}
                                    onEdit={() => handleEditBlock(block)}
                                    onDelete={() => setBlockToDelete(block)}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                    <div className="flex justify-center pt-4">
                        <Button variant="outline" className="w-full border-dashed py-6 text-base" onClick={handleAddNewBlock}>
                            <PlusCircle className="mr-2 h-5 w-5"/>
                            コンテンツブロックを追加
                        </Button>
                    </div>
                </div>
            </div>
       </main>
    </div>
  );
}


function SortableBlockItem({ block, assets, onEdit, onDelete }: { block: PublicPageBlock; assets: Asset[]; onEdit: () => void; onDelete: () => void; }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const blockIcons = {
        text: <TypeIcon className="w-5 h-5 text-muted-foreground" />,
        photo: <ImageIcon className="w-5 h-5 text-muted-foreground" />,
        album: <Album className="w-5 h-5 text-muted-foreground" />,
        video: <VideoIcon className="w-5 h-5 text-muted-foreground" />,
        audio: <Mic className="w-5 h-5 text-muted-foreground" />,
    }

    const renderBlockContent = () => {
        if (block.type === 'photo' && block.photo?.assetId) {
            const asset = assets.find(a => a.id === block.photo?.assetId);
            if (asset?.url) {
                return (
                    <div className="p-2 space-y-2">
                        <p className="font-semibold text-sm truncate">{block.title || "無題の写真"}</p>
                        <div className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: '16/9' }}>
                           <Image src={asset.url} alt={block.title || 'Photo content'} fill sizes="(max-width: 768px) 100vw, 80vw" className="object-cover" />
                        </div>
                        {block.photo.caption && <p className="text-sm text-muted-foreground mt-2">{block.photo.caption}</p>}
                    </div>
                )
            }
        }
        
        if (block.type === 'video' && block.video?.assetId) {
            const asset = assets.find(a => a.id === block.video?.assetId);
            if (asset) {
                const thumbnailUrl = asset.thumbnailUrl;
                return (
                    <div className="p-2 space-y-2">
                        <p className="font-semibold text-sm truncate">{block.title || "無題の動画"}</p>
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-800">
                           {thumbnailUrl ? (
                                <Image src={thumbnailUrl} alt={block.title || 'Video content'} fill sizes="(max-width: 768px) 100vw, 80vw" className="object-cover opacity-80" data-ai-hint="video placeholder" />
                           ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-white bg-black/20">
                                   <Loader2 className="w-8 h-8 animate-spin" />
                                   <span className="mt-2 text-xs font-semibold">サムネイル生成中...</span>
                               </div>
                           )}
                           <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                <Clapperboard className="w-10 h-10 text-white/80" />
                           </div>
                        </div>
                    </div>
                )
            }
        }

        // Fallback for other types or if photo asset not found
        return (
             <div className="flex flex-grow items-center gap-3 p-3">
                <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                    {blockIcons[block.type] || <GripVertical className="w-5 h-5" />}
                </div>
                 <div>
                    <p className="font-semibold">{block.title || `無題の${block.type}ブロック`}</p>
                    <p className="text-sm text-muted-foreground capitalize">{block.type}</p>
                </div>
            </div>
        )
    };

    return (
        <div ref={setNodeRef} style={style} className="rounded-lg border bg-card shadow-sm flex items-center transition-shadow hover:shadow-md">
             <button {...attributes} {...listeners} className="cursor-grab p-4 touch-none self-stretch flex items-center border-r">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            
            <div className="flex-grow cursor-pointer" onClick={onEdit}>
                {renderBlockContent()}
            </div>

            <div className="flex items-center gap-1 p-2 border-l">
                 <Button variant="ghost" size="icon" onClick={onEdit}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">編集</span>
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}>
                    <Trash2 className="h-4 w-4" />
                     <span className="sr-only">削除</span>
                </Button>
            </div>
        </div>
    );
}
