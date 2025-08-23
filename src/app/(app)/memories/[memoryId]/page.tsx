// src/app/(app)/memories/[memoryId]/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import type { Memory, PublicPageBlock, Asset } from '@/lib/types';
import { db } from '@/lib/firebase/client';
import { doc, onSnapshot, collection, query, orderBy, writeBatch, deleteDoc, getDocs, Timestamp } from 'firebase/firestore';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Eye, Loader2, PlusCircle, Edit, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { AboutModal, DesignModal, BlockModal } from '@/components/edit-modals';
import { GripVertical } from 'lucide-react';


// This is the new Visual Editor Page
export default function MemoryEditorPage() {
  const params = useParams();
  const memoryId = params.memoryId as string;
  const { user, loading: authLoading } = useAuth();
  
  const [memory, setMemory] = useState<Memory | null>(null);
  const [blocks, setBlocks] = useState<PublicPageBlock[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // --- Modal States ---
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<PublicPageBlock | null>(null);


  // DND sensors
   const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchAssetsForMemory = useCallback(async (currentMemoryId: string) => {
    try {
      // Efficiently query only the assets belonging to this specific memory page.
      const assetsQuery = query(collection(db, 'memories', currentMemoryId, 'assets'), orderBy('createdAt', 'desc'));
      const assetsSnapshot = await getDocs(assetsQuery);
      const fetchedAssets: Asset[] = assetsSnapshot.docs.map(docSnap => ({ 
          id: docSnap.id, 
          ...docSnap.data(),
          createdAt: (docSnap.data().createdAt as Timestamp).toDate(),
          updatedAt: (docSnap.data().updatedAt as Timestamp).toDate(),
      } as Asset));
      setAssets(fetchedAssets);
    } catch (e) {
        console.error("Failed to fetch assets for memory:", e);
        toast({ variant: 'destructive', title: "アセット読み込みエラー", description: "このページのメディアファイルの読み込みに失敗しました。" });
    }
  }, [toast]);


  // Fetch all required data
  useEffect(() => {
    if (authLoading || !user || !memoryId) return;

    let unsubMemory: () => void;
    let unsubBlocks: () => void;
    
    setLoading(true);

    const fetchAllData = async () => {
        try {
            // Listener for memory document
            const memoryDocRef = doc(db, 'memories', memoryId);
            unsubMemory = onSnapshot(memoryDocRef, (doc) => {
                if (doc.exists() && doc.data()?.ownerUid === user.uid) {
                     setMemory({ id: doc.id, ...doc.data() } as Memory);
                     // Fetch or re-fetch assets when memory data is loaded/updated
                     fetchAssetsForMemory(doc.id);
                } else {
                    console.error("Memory not found or access denied.");
                    setMemory(null);
                }
            }, (error) => {
              console.error("Error fetching memory:", error);
              toast({ variant: 'destructive', title: "Error", description: "ページデータの読み込みに失敗しました。" });
              setMemory(null);
            });

            // Listener for blocks subcollection
            const blocksQuery = query(collection(db, 'memories', memoryId, 'blocks'), orderBy('order', 'asc'));
            unsubBlocks = onSnapshot(blocksQuery, (snapshot) => {
                const fetchedBlocks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicPageBlock));
                setBlocks(fetchedBlocks);
            });

        } catch (error) {
            console.error("Error setting up page data listeners:", error);
            toast({ variant: 'destructive', title: "Error", description: "ページのデータ読み込みに失敗しました。" });
        } finally {
            setLoading(false);
        }
    }
    
    fetchAllData();


    return () => {
      if (unsubMemory) unsubMemory();
      if (unsubBlocks) unsubBlocks();
    }

  }, [memoryId, user, authLoading, toast, fetchAssetsForMemory]);
  
  async function handleDragEnd(event: DragEndEvent) {
    const {active, over} = event;
    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        const batch = writeBatch(db);
        newItems.forEach((item, index) => {
            const blockRef = doc(db, 'memories', memoryId, 'blocks', item.id);
            batch.update(blockRef, { order: index });
        });
        
        batch.commit().catch(error => {
            console.error("Failed to reorder blocks:", error);
            toast({ variant: 'destructive', title: 'エラー', description: 'ブロックの並び替えに失敗しました。' });
            // Revert state on failure
            setBlocks(items);
        });

        return newItems;
      });
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
     // Add the new asset to the top of the list for immediate UI feedback.
    setAssets(prevAssets => [asset, ...prevAssets]);
  }


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
            blockCount={blocks.length}
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


function SortableBlockItem({ block, onEdit }: { block: PublicPageBlock; onEdit: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
    const { toast } = useToast();
    const params = useParams();
    const memoryId = params.memoryId as string;

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("このブロックを本当に削除しますか？")) return;
        try {
            await deleteDoc(doc(db, 'memories', memoryId, 'blocks', block.id));
            toast({ title: "ブロックを削除しました" });
        } catch (error) {
            console.error("Failed to delete block:", error);
            toast({ variant: 'destructive', title: "エラー", description: "ブロックの削除に失敗しました。" });
        }
    };

    return (
        <div ref={setNodeRef} style={style} className="group relative p-4 rounded-lg border bg-card shadow-sm flex items-center gap-4 transition-shadow hover:shadow-md">
             <button {...attributes} {...listeners} className="cursor-grab p-2 touch-none">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="flex-grow" onClick={onEdit}>
                <p className="font-semibold">{block.title || "無題のブロック"}</p>
                <p className="text-sm text-muted-foreground capitalize">{block.type}</p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={onEdit}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">編集</span>
                </Button>
                <Button variant="destructive" size="icon" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4" />
                     <span className="sr-only">削除</span>
                </Button>
            </div>
        </div>
    );
}