// src/app/(app)/memories/[memoryId]/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import type { Memory, PublicPageBlock, Asset } from '@/lib/types';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, Timestamp, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Eye, Loader2, PlusCircle, Edit, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { AboutModal, DesignModal, BlockModal } from '@/components/edit-modals';
import { GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';


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
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<PublicPageBlock | null>(null);

  const blocks = useMemo(() => memory?.blocks || [], [memory]);

  // DND sensors
   const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const fetchAllData = useCallback(async (currentMemoryId: string, currentUid: string) => {
    setLoading(true);
    try {
      const memoryDocRef = doc(db, 'memories', currentMemoryId);
      const memoryDocSnap = await getDoc(memoryDocRef);

      if (!memoryDocSnap.exists() || memoryDocSnap.data()?.ownerUid !== currentUid) {
        console.error("Memory not found or access denied.");
        setMemory(null);
        setLoading(false);
        return;
      }
      
      const memoryData = { 
        id: memoryDocSnap.id, 
        ...memoryDocSnap.data(),
        blocks: memoryDocSnap.data().blocks || [] 
      } as Memory;
      setMemory(memoryData);

      // This logic for fetching assets is now simplified as they are part of the memory doc
      // or would be managed in a global library. For this editor, we'll assume
      // asset URLs are directly on the blocks or we fetch from a global asset store if needed.
      // For now, we will simulate fetching related assets if they are referenced by ID.
      
      // In a real app, you might query an 'assets' collection where memoryId is in a list of asset IDs.
      // For simplicity here, we assume assets are either globally available or their URLs are on blocks.
      // We will leave the local `assets` state for modals that might need a list of selectable media.
      
      setLoading(false);
    } catch (e) {
      console.error("Error fetching page data:", e);
      toast({ variant: 'destructive', title: "Error", description: "ページデータの読み込みに失敗しました。" });
      setMemory(null);
      setLoading(false);
    }
  }, [toast]);


  // Fetch all required data
  useEffect(() => {
    if (authLoading || !user || !memoryId) return;
    fetchAllData(memoryId, user.uid);
  }, [memoryId, user, authLoading, fetchAllData]);
  
  async function handleDragEnd(event: DragEndEvent) {
    const {active, over} = event;
    if (over && active.id !== over.id) {
        if (!memory) return;
        
        const oldIndex = blocks.findIndex((item) => item.id === active.id);
        const newIndex = blocks.findIndex((item) => item.id === over.id);
        const newBlocks = arrayMove(blocks, oldIndex, newIndex);

        // Update the order property for each block
        const reorderedBlocks = newBlocks.map((block, index) => ({ ...block, order: index }));

        try {
            const memoryRef = doc(db, 'memories', memoryId);
            await updateDoc(memoryRef, { blocks: reorderedBlocks, updatedAt: serverTimestamp() });
            // The local state will be updated optimistically for a better UX,
            // or you can rely on re-fetching/state-management library.
            setMemory(prev => prev ? { ...prev, blocks: reorderedBlocks } : null);
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

  const handleAssetUpload = (asset: Asset) => {
    setAssets(prevAssets => [asset, ...prevAssets]);
  }
  
  const handleSaveBlock = async (newBlockData: Omit<PublicPageBlock, 'id' | 'createdAt' | 'updatedAt' | 'order'>, blockToEdit?: PublicPageBlock | null) => {
      if (!memory) return;
      const memoryRef = doc(db, 'memories', memoryId);

      try {
        if (blockToEdit) { // Editing existing block
            const updatedBlocks = blocks.map(b => 
                b.id === blockToEdit.id ? { ...b, ...newBlockData, updatedAt: Timestamp.now() } : b
            );
            await updateDoc(memoryRef, { blocks: updatedBlocks, updatedAt: serverTimestamp() });
            setMemory(prev => prev ? { ...prev, blocks: updatedBlocks } : null);
            toast({ title: "成功", description: "ブロックを更新しました。" });
        } else { // Adding new block
            const newBlock: PublicPageBlock = {
                ...newBlockData,
                id: uuidv4(),
                order: blocks.length,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };
            await updateDoc(memoryRef, { blocks: arrayUnion(newBlock), updatedAt: serverTimestamp() });
            setMemory(prev => prev ? { ...prev, blocks: [...prev.blocks, newBlock] } : null);
            toast({ title: "成功", description: "新しいブロックを追加しました。" });
        }
      } catch (error) {
        console.error('Error saving block:', error);
        toast({ variant: 'destructive', title: 'エラー', description: 'ブロックの保存に失敗しました。' });
      }
  };
  
   const handleDeleteBlock = async (blockId: string) => {
      if (!memory) return;
      const blockToDelete = blocks.find(b => b.id === blockId);
      if (!blockToDelete) return;

      if (!window.confirm("このブロックを本当に削除しますか？")) return;

      try {
          const memoryRef = doc(db, 'memories', memoryId);
          await updateDoc(memoryRef, {
              blocks: arrayRemove(blockToDelete),
              updatedAt: serverTimestamp()
          });
          const newBlocks = blocks.filter(b => b.id !== blockId);
          setMemory(prev => prev ? { ...prev, blocks: newBlocks } : null);
          toast({ title: "ブロックを削除しました" });
      } catch (error) {
          console.error("Failed to delete block:", error);
          toast({ variant: 'destructive', title: "エラー", description: "ブロックの削除に失敗しました。" });
      }
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
  
  const publicUrl = `/p/preview`;
  const coverImageUrl = memory.coverAssetId ? assets.find(a => a.id === memory.coverAssetId)?.url : null;
  const profileImageUrl = memory.profileAssetId ? assets.find(a => a.id === memory.profileAssetId)?.url : null;

  return (
    <div className="flex h-full flex-col bg-muted/30">
       {isDesignModalOpen && memory && (
        <DesignModal 
            isOpen={isDesignModalOpen}
            setIsOpen={setIsDesignModalOpen}
            memory={memory}
            assets={assets}
            onUploadSuccess={handleAssetUpload}
        />
       )}
       {isAboutModalOpen && memory && (
        <AboutModal
            isOpen={isAboutModalOpen}
            setIsOpen={setIsAboutModalOpen}
            memory={memory}
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
            onUploadSuccess={handleAssetUpload}
        />
       )}

      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 sm:px-6">
        <div>
           <h1 className="text-xl font-bold tracking-tight font-headline truncate max-w-[200px] sm:max-w-none">{memory.title}</h1>
           <p className="text-sm text-muted-foreground">ビジュアルエディタ</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="mr-2 h-4 w-4" />
                プレビュー
            </a>
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
                 <div className="relative mb-[-72px] sm:mb-[-80px]">
                    <div 
                        className="group relative aspect-[21/9] w-full overflow-hidden bg-muted flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-inner"
                        onClick={() => setIsDesignModalOpen(true)}
                    >
                        {coverImageUrl ? (
                            <Image src={coverImageUrl} alt="カバー画像" fill className="object-cover" />
                        ) : (
                             <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        )}
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <p className="text-white font-bold flex items-center gap-2"><Edit className="h-4 w-4" />カバー画像を編集</p>
                        </div>
                    </div>
                     <div 
                        className="group absolute -bottom-16 sm:-bottom-20 left-1/2 -translate-x-1/2 h-32 w-32 sm:h-40 sm:w-40 overflow-hidden rounded-full border-4 border-background bg-muted flex items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
                        onClick={() => setIsDesignModalOpen(true)}
                     >
                        {profileImageUrl ? (
                             <Image src={profileImageUrl} alt="プロフィール画像" fill className="object-cover" />
                        ) : (
                            <ImageIcon className="h-10 w-10 text-muted-foreground" />
                        )}
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <p className="text-white font-bold text-center text-sm"><Edit className="h-4 w-4 mx-auto mb-1" />編集</p>
                        </div>
                    </div>
                </div>
                
                {/* About Section */}
                <div className="mt-24 sm:mt-28 text-center px-4">
                     <div className="group relative inline-block">
                        <h1 className="text-3xl font-bold sm:text-4xl">{memory.title}</h1>
                        <p className="mt-2 text-base text-muted-foreground max-w-prose">{memory.description || "紹介文を編集..."}</p>
                         <Button variant="outline" size="sm" className="absolute -top-2 -right-12 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setIsAboutModalOpen(true)}>
                            <Edit className="h-4 w-4"/>
                        </Button>
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
                                    onEdit={() => handleEditBlock(block)}
                                    onDelete={() => handleDeleteBlock(block.id)}
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


function SortableBlockItem({ block, onEdit, onDelete }: { block: PublicPageBlock; onEdit: () => void; onDelete: () => void; }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete();
    };

    return (
        <div ref={setNodeRef} style={style} className="group relative p-4 rounded-lg border bg-card shadow-sm flex items-center gap-4 transition-shadow hover:shadow-md">
             <button {...attributes} {...listeners} className="cursor-grab p-2 touch-none">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="flex-grow cursor-pointer" onClick={onEdit}>
                <p className="font-semibold">{block.title || "無題のブロック"}</p>
                <p className="text-sm text-muted-foreground capitalize">{block.type}</p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={onEdit}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">編集</span>
                </Button>
                <Button variant="destructive" size="icon" onClick={handleDeleteClick}>
                    <Trash2 className="h-4 w-4" />
                     <span className="sr-only">削除</span>
                </Button>
            </div>
        </div>
    );
}
