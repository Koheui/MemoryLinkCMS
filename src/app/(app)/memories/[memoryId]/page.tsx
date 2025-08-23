// src/app/(app)/memories/[memoryId]/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import type { Memory, PublicPageBlock, Asset } from '@/lib/types';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, Timestamp, updateDoc, arrayUnion, arrayRemove, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
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

  const blocks = useMemo(() => memory?.blocks || [], [memory]);

  // DND sensors
   const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const fetchAllData = useCallback(async (currentMemoryId: string, currentUid: string) => {
    // setLoading(true) is not set here to avoid re-showing loader on block updates
    try {
      const memoryDocRef = doc(db, 'memories', currentMemoryId);
      const memoryDocSnap = await getDoc(memoryDocRef);

      if (!memoryDocSnap.exists() || memoryDocSnap.data()?.ownerUid !== currentUid) {
        console.error("Memory not found or access denied.");
        setMemory(null); // This will trigger notFound()
        setLoading(false);
        return;
      }
      
      const memoryData = { 
        id: memoryDocSnap.id, 
        ...memoryDocSnap.data(),
        blocks: memoryDocSnap.data().blocks || []
      } as Memory;
      
      setMemory(memoryData);

      // Fetch assets associated with the user
      const assetsQuery = query(
        collection(db, 'assets'),
        where('ownerUid', '==', currentUid)
      );
      const assetsSnap = await getDocs(assetsQuery);
      const fetchedAssets = assetsSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date()
          } as Asset
      });

      // Client-side sort
      fetchedAssets.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return dateB - dateA;
      });
      
      setAssets(fetchedAssets);
      
    } catch (e) {
      console.error("Error fetching page data:", e);
      toast({ variant: 'destructive', title: "Error", description: "ページデータの読み込みに失敗しました。" });
      setMemory(null); // This will trigger notFound()
    } finally {
        setLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    if (authLoading || !user || !memoryId) return;
    setLoading(true);
    fetchAllData(memoryId, user.uid);
  }, [memoryId, user, authLoading, fetchAllData]);
  
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
    setAssets(prevAssets => {
      // Avoid duplicates and add new asset to the top
      if (prevAssets.some(a => a.id === asset.id)) {
        return prevAssets;
      }
      const newAssets = [asset, ...prevAssets];
      newAssets.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return dateB - dateA;
      });
      return newAssets;
    });
  };
  
  const handleSaveBlock = async (newBlockData: Omit<PublicPageBlock, 'id' | 'createdAt' | 'updatedAt' | 'order'>, blockToEdit?: PublicPageBlock | null) => {
      if (!memory) return;
      const memoryRef = doc(db, 'memories', memoryId);

      try {
        if (blockToEdit) { 
            const updatedBlocks = blocks.map(b => 
                b.id === blockToEdit.id ? { ...b, ...newBlockData, updatedAt: Timestamp.now() } : b
            );
            await updateDoc(memoryRef, { blocks: updatedBlocks, updatedAt: serverTimestamp() });
            setMemory(prev => prev ? { ...prev, blocks: updatedBlocks } : null);
            toast({ title: "成功", description: "ブロックを更新しました。" });
        } else { 
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

  const handleAboutSave = (data: { title: string, description: string, profileAssetId: string | null }) => {
    if (!memory) return;
    setMemory(prev => prev ? {
        ...prev,
        ...data,
    } : null);
  };
  
  const handleCoverPhotoSave = (data: { coverAssetId: string | null }) => {
      if(!memory) return;
      setMemory(prev => prev ? {
        ...prev,
        ...data,
      } : null);
  }
  
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
          const newBlocks = blocks.filter(b => b.id !== blockId).map((b, index) => ({ ...b, order: index }));
          setMemory(prev => prev ? { ...prev, blocks: newBlocks } : null);
          toast({ title: "ブロックを削除しました" });
      } catch (error) {
          console.error("Failed to delete block:", error);
          toast({ variant: 'destructive', title: "エラー", description: "ブロックの削除に失敗しました。" });
      }
  };

  const handlePreview = () => {
    if (!memory) return;
    
    const getAssetUrl = (assetId: string | null): string | undefined => {
      if (!assetId) return undefined;
      return assets.find(a => a.id === assetId)?.url;
    };
    
    const previewData = {
      ...memory,
      media: {
        cover: { url: getAssetUrl(memory.coverAssetId) || "https://placehold.co/1200x480.png" },
        profile: { url: getAssetUrl(memory.profileAssetId) || "https://placehold.co/400x400.png" },
      },
      blocks: memory.blocks.map(block => {
        const newBlock = { ...block };
        if (newBlock.type === 'photo' && newBlock.photo?.assetId) {
            newBlock.photo.src = getAssetUrl(newBlock.photo.assetId);
        }
        if (newBlock.type === 'video' && newBlock.video?.assetId) {
            newBlock.video.src = getAssetUrl(newBlock.video.assetId);
        }
        if (newBlock.type === 'audio' && newBlock.audio?.assetId) {
            newBlock.audio.src = getAssetUrl(newBlock.audio.assetId);
        }
        if (newBlock.type === 'album' && newBlock.album?.assetIds) {
            newBlock.album.items = newBlock.album.assetIds.map(id => ({ src: getAssetUrl(id) || '' }));
        }
        return newBlock;
      })
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
            onUploadSuccess={handleAssetUpload}
            onSave={handleCoverPhotoSave}
        />
       )}
       {isAboutModalOpen && memory && (
        <AboutModal
            isOpen={isAboutModalOpen}
            setIsOpen={setIsAboutModalOpen}
            memory={memory}
            assets={assets}
            onUploadSuccess={handleAssetUpload}
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
                 <div className="relative mb-[-72px] sm:mb-[-80px]">
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
                     <div 
                        className="group absolute -bottom-16 sm:-bottom-20 left-1/2 -translate-x-1/2 h-32 w-32 sm:h-40 sm:w-40 overflow-hidden rounded-full border-4 border-background bg-muted flex items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
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
                </div>
                
                {/* About Section */}
                <div 
                    className="group relative mt-24 sm:mt-28 text-center px-4 cursor-pointer"
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


function SortableBlockItem({ block, assets, onEdit, onDelete }: { block: PublicPageBlock; assets: Asset[], onEdit: () => void; onDelete: () => void; }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete();
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
                        <p className="font-semibold text-sm">{block.title || "無題の写真"}</p>
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
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
                return (
                    <div className="p-2 space-y-2">
                        <p className="font-semibold text-sm">{block.title || "無題の動画"}</p>
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-800">
                           <Image src="https://placehold.co/600x400.png" alt={block.title || 'Video content'} fill sizes="(max-width: 768px) 100vw, 80vw" className="object-cover opacity-50" data-ai-hint="video placeholder" />
                           <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                               <Clapperboard className="w-10 h-10" />
                               <span className="mt-2 text-xs font-semibold">{asset.name}</span>
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
        <div ref={setNodeRef} style={style} className="group relative rounded-lg border bg-card shadow-sm flex items-center gap-2 transition-shadow hover:shadow-md">
             <button {...attributes} {...listeners} className="cursor-grab p-4 touch-none self-stretch flex items-center">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="flex-grow cursor-pointer" onClick={onEdit}>
                {renderBlockContent()}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 absolute right-4 top-4 bg-card/50 backdrop-blur-sm rounded-md p-1">
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
