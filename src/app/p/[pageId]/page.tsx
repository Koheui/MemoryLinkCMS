// src/app/p/[pageId]/page.tsx
'use client';
import { useState, useEffect, Suspense, useRef, useMemo } from 'react';
import { useParams, notFound, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import type { PublicPageBlock, Memory, Asset, Design, PublicPage } from '@/lib/types';
import { Globe, Phone, Mail, Link as LinkIcon, Music, Clapperboard, Milestone, Camera, Loader2, X } from 'lucide-react';
import { FaXTwitter, FaInstagram, FaYoutube } from 'react-icons/fa6';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

// This function fetches both the memory and its associated assets for a real public page
async function fetchPublicPageData(pageId: string): Promise<{ memory: Memory, assets: Asset[] } | null> {
    try {
        const memoryDoc = await getDoc(doc(db, "memories", pageId));
        if (!memoryDoc.exists()) { 
            console.error(`Memory with pageId ${pageId} not found.`);
            return null;
        }
        const memoryData = { id: memoryDoc.id, ...memoryDoc.data() } as Memory;

        // Fetch all assets owned by the user. This is a simplification.
        // A better approach would be to query assets where memoryId matches.
        const assetSnapshots = await getDocs(query(collection(db, "assets"), where("ownerUid", "==", memoryData.ownerUid)));
        const assets = assetSnapshots.docs.map(d => ({ id: d.id, ...d.data() } as Asset));

        return { memory: memoryData, assets };

    } catch (error) {
        console.error(`Error fetching page data for ${pageId}:`, error);
        return null;
    }
}

// Convert Memory to PublicPage for rendering. This is used for previewing and for real pages.
function convertMemoryToPublicPage(memory: Memory, assets: Asset[]): PublicPage {
    const getAssetUrlById = (assetId: string | null): string | undefined => {
        if (!assetId) return undefined;
        return assets.find((a: Asset) => a.id === assetId)?.url;
    }
    const getAssetById = (assetId: string | null): Asset | undefined => {
        if (!assetId) return undefined;
        return assets.find((a: Asset) => a.id === assetId);
    }
    
    // Function to revive ISO date strings back to Date objects, then to Timestamps for type compatibility
    const reviveTimestamps = (obj: any): any => {
        if (!obj) return obj;
        if (Array.isArray(obj)) {
            return obj.map(item => reviveTimestamps(item));
        }
        if (typeof obj === 'object') {
            const newObj: { [key: string]: any } = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    if ((key === 'createdAt' || key === 'updatedAt') && typeof obj[key] === 'string') {
                         newObj[key] = Timestamp.fromDate(new Date(obj[key]));
                    } else {
                        newObj[key] = reviveTimestamps(obj[key]);
                    }
                }
            }
            return newObj;
        }
        return obj;
    };
    
    const revivedMemory = reviveTimestamps(memory);

    const hydratedBlocks = (revivedMemory.blocks || []).map((block: PublicPageBlock) => {
        const newBlock = { ...block };
        if (newBlock.type === 'photo' && newBlock.photo?.assetId) {
            newBlock.photo.src = getAssetUrlById(newBlock.photo.assetId);
        }
        if (newBlock.type === 'video' && newBlock.video?.assetId) {
            const asset = getAssetById(newBlock.video.assetId);
            newBlock.video.src = asset?.url;
            newBlock.video.poster = asset?.thumbnailUrl;
        }
        if (newBlock.type === 'audio' && newBlock.audio?.assetId) {
            newBlock.audio.src = getAssetUrlById(newBlock.audio.assetId);
        }
        if (newBlock.type === 'album' && newBlock.album?.assetIds) {
            newBlock.album.items = newBlock.album.assetIds.map((id: string) => ({ 
                src: getAssetUrlById(id) || '',
                caption: assets.find(a => a.id === id)?.name || ''
            }));
        }
        return newBlock;
    });


    return {
        id: revivedMemory.id,
        memoryId: revivedMemory.id,
        title: revivedMemory.title,
        about: {
            text: revivedMemory.description || '',
            format: 'plain'
        },
        design: revivedMemory.design,
        media: {
            cover: { url: getAssetUrlById(revivedMemory.coverAssetId) || "https://placehold.co/1200x480.png", width: 1200, height: 480 },
            profile: { url: getAssetUrlById(revivedMemory.profileAssetId) || "https://placehold.co/400x400.png", width: 400, height: 400 },
        },
        ordering: 'custom',
        blocks: hydratedBlocks,
        publish: {
            status: 'published',
            publishedAt: revivedMemory.updatedAt,
        },
        createdAt: revivedMemory.createdAt,
        updatedAt: revivedMemory.updatedAt,
    };
}

// --- Album Detail Modal (Lightbox) ---
function AlbumDetailModal({ isOpen, setIsOpen, items, startIndex }: { isOpen: boolean, setIsOpen: (open: boolean) => void, items: { src: string, caption?: string }[], startIndex: number }) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && scrollRef.current) {
            const element = scrollRef.current.children[startIndex] as HTMLElement;
            if (element) {
                 setTimeout(() => element.scrollIntoView({ behavior: 'auto', block: 'center' }), 100);
            }
        }
    }, [isOpen, startIndex]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl w-full h-full sm:h-[95vh] flex flex-col p-0 gap-0 bg-black/90 backdrop-blur-sm border-0">
                <DialogHeader className="p-4 flex-row items-center justify-between border-b border-white/20 text-white">
                    <DialogTitle>アルバム</DialogTitle>
                     <DialogClose className="relative rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                        <X className="h-6 w-6" />
                        <span className="sr-only">Close</span>
                    </DialogClose>
                </DialogHeader>
                <div className="flex-1 overflow-auto p-4 sm:p-8">
                    <div ref={scrollRef} className="space-y-8">
                        {items.map((item, index) => (
                            <div key={index} className="space-y-2">
                                 <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden">
                                    <Image src={item.src} alt={item.caption || 'Album image'} fill className="object-contain" sizes="(max-width: 1024px) 100vw, 80vw" />
                                </div>
                                {item.caption && <p className="text-center text-sm text-white/80">{item.caption}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}


const blockIcons: { [key: string]: React.ReactNode } = {
  globe: <Globe className="h-6 w-6" />,
  youtube: <FaYoutube className="h-6 w-6" />, 
  tel: <Phone className="h-6 w-6" />,
  mail: <Mail className="h-6 w-6" />,
  x: <FaXTwitter className="h-5 w-5" />, 
  instagram: <FaInstagram className="h-6 w-6" />,
  default: <LinkIcon className="h-6 w-6" />,
};

const BlockRenderer = ({ block, design, setLightboxState }: { block: PublicPageBlock, design: Design, setLightboxState: (state: { isOpen: boolean, items: any[], startIndex: number }) => void }) => {
    const cardStyle = {
        backgroundColor: design.cardBgColor,
        color: design.cardTextColor,
    };
    
    const textStyle = {
        color: design.cardTextColor
    }
    
    const mutedTextStyle = {
        color: design.cardTextColor,
        opacity: 0.7,
    }

    switch (block.type) {
        case 'album':
            return (
                <Card style={cardStyle} className="overflow-hidden backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                           <Milestone style={mutedTextStyle} className="h-5 w-5" />
                           <h3 style={textStyle} className="font-semibold">{block.title}</h3>
                        </div>
                    </CardHeader>
                    <CardContent className="pl-4 sm:pl-6">
                        <Carousel opts={{ align: "start", loop: false }} className="w-full">
                            <CarouselContent className="-ml-4">
                                {block.album?.items?.map((item, index) => (
                                    <CarouselItem key={index} className="basis-2/3">
                                        <button className="w-full block" onClick={() => setLightboxState({ isOpen: true, items: block.album?.items || [], startIndex: index })}>
                                            <div className="aspect-square relative rounded-lg overflow-hidden group">
                                               {item.src && <Image src={item.src} alt={block.title || `Album image ${index+1}`} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 66vw, 50vw" />}
                                            </div>
                                        </button>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            { (block.album?.items?.length || 0) > 1 && (
                                <>
                                    <CarouselPrevious className="ml-16 hidden sm:flex" />
                                    <CarouselNext className="mr-16 hidden sm:flex" />
                                </>
                            )}
                        </Carousel>
                    </CardContent>
                </Card>
            );
        case 'photo':
             return (
                 <Card style={cardStyle} className="overflow-hidden backdrop-blur-sm">
                    {block.photo?.src && (
                         <div className="aspect-video relative w-full">
                             <Image src={block.photo.src} alt={block.title || "Single photo"} fill className="object-cover" />
                         </div>
                    )}
                    <CardContent className="p-4">
                        <h3 style={textStyle} className="font-semibold">{block.title}</h3>
                        {block.photo?.caption && <p style={mutedTextStyle} className="text-sm mt-1">{block.photo.caption}</p>}
                    </CardContent>
                </Card>
            );
        case 'video':
            return (
                 <Card style={cardStyle} className="overflow-hidden group backdrop-blur-sm">
                    <div className="aspect-video relative w-full bg-black">
                        {block.video?.poster ? (
                             <Image src={block.video.poster} alt={block.title || "Video thumbnail"} fill className="object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                        ) : <div className="w-full h-full bg-black flex items-center justify-center"><Clapperboard className="h-16 w-16 text-white/70" /></div>}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Clapperboard className="h-16 w-16 text-white/70" />
                        </div>
                    </div>
                    <CardContent className="p-4">
                        <h3 style={textStyle} className="font-semibold">{block.title}</h3>
                    </CardContent>
                </Card>
            );
        case 'audio':
              return (
                 <Card style={cardStyle} className="flex items-center gap-4 p-4 backdrop-blur-sm">
                    <div className="flex-shrink-0">
                        <Music style={mutedTextStyle} className="h-8 w-8" />
                    </div>
                    <div className="flex-grow">
                        <h3 style={textStyle} className="font-semibold">{block.title}</h3>
                    </div>
                    <div className="flex-shrink-0">
                       <Badge variant="outline" className="border-current">再生</Badge>
                    </div>
                </Card>
            );
        case 'text':
             return (
               <a href="#" style={cardStyle} className="group block w-full rounded-xl p-2 ring-1 ring-black/10 backdrop-blur-sm transition-all duration-300 ease-in-out hover:scale-[1.02]">
                    <div className="flex items-center gap-4 rounded-lg bg-transparent p-3">
                        <div style={mutedTextStyle} className="flex-shrink-0">
                           {blockIcons[block.icon || 'default'] || blockIcons.default}
                        </div>
                        <div style={textStyle} className="flex-grow text-left font-semibold">
                            {block.title}
                        </div>
                         <div style={mutedTextStyle} className="flex-shrink-0 transition-transform group-hover:translate-x-1">
                            <LinkIcon className="h-5 w-5" />
                        </div>
                    </div>
                </a>
            );
        default:
            return null;
    }
}

function PageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pageId = params.pageId as string;
  const [manifest, setManifest] = useState<PublicPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxState, setLightboxState] = useState<{isOpen: boolean, items: any[], startIndex: number}>({ isOpen: false, items: [], startIndex: 0 });
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    async function loadPageData() {
        setLoading(true);
        setError(null);
        
        if (pageId === 'preview') {
            const encodedData = localStorage.getItem('previewData');
            if (encodedData) {
                try {
                    const parsedData = JSON.parse(encodedData);
                    if (parsedData.memory && parsedData.assets) {
                        const pageData = convertMemoryToPublicPage(parsedData.memory, parsedData.assets);
                        setManifest(pageData);
                        setAssets(parsedData.assets);
                    } else {
                        throw new Error("Invalid preview data structure in localStorage.");
                    }
                } catch (e: any) {
                    console.error("Failed to parse preview data from localStorage:", e);
                    setError('プレビューデータの解析に失敗しました。データが破損している可能性があります。');
                } finally {
                    localStorage.removeItem('previewData');
                }
            } else {
                 setError('プレビューデータが見つかりませんでした。編集画面から再度プレビューボタンを押してください。');
            }
            setLoading(false);
        } else if (pageId) {
            const data = await fetchPublicPageData(pageId);
            if (data) {
                setManifest(convertMemoryToPublicPage(data.memory, data.assets));
                setAssets(data.assets);
            } else {
                 setError('この想い出ページは存在しないか、まだ公開されていません。');
            }
            setLoading(false);
        }
    }
    
    loadPageData();
  }, [pageId, searchParams]);

  useEffect(() => {
    if (manifest?.title) {
      document.title = `${manifest.title} - 想い出クラウド`;
    }
  }, [manifest]);

  const backgroundImage = useMemo(() => {
    if (manifest?.design.backgroundImageAssetId) {
        return assets.find(a => a.id === manifest.design.backgroundImageAssetId)?.url;
    }
    return null;
  }, [manifest, assets]);

  if (loading) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
    )
  }

  if (error || !manifest) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white text-center p-4">
            <h1 className="text-2xl font-bold">ページが見つかりません</h1>
            <p className="mt-2 text-gray-300">{error || '不明なエラーが発生しました。'}</p>
        </div>
    );
  }

  const design = manifest.design || {};
  
  return (
    <>
    <AlbumDetailModal 
        isOpen={lightboxState.isOpen}
        setIsOpen={(open) => setLightboxState(prev => ({...prev, isOpen: open}))}
        items={lightboxState.items}
        startIndex={lightboxState.startIndex}
    />
    <div style={{ 
        backgroundColor: design.bgColor || '#111827', 
        color: design.textColor || '#FFFFFF',
        fontFamily: design.fontFamily || 'sans-serif',
     } as React.CSSProperties}
     className="min-h-screen relative"
     >
      {backgroundImage && (
        <div className="absolute inset-0 z-0">
            <Image src={backgroundImage} alt="Background" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/30" />
        </div>
      )}

      <div className="container mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:py-12 relative z-10">
        <header className="relative">
            <div className="relative h-48 w-full overflow-hidden rounded-xl md:h-56">
                <Image 
                  src={manifest.media.cover.url}
                  alt={manifest.title}
                  fill
                  priority
                  data-ai-hint="background scenery"
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
            </div>
            
            <div className="relative flex flex-col items-center -mt-20">
                <div className="h-40 w-40 rounded-full z-10 bg-gray-800 border-4 border-background relative overflow-hidden shrink-0">
                    <Image 
                        src={manifest.media.profile.url}
                        alt="Profile"
                        fill
                        data-ai-hint="portrait person"
                        className="rounded-full object-cover"
                        sizes="160px"
                    />
                </div>
                
                <div className="mt-4 text-center">
                    <h1 className="text-5xl font-bold">{manifest.title}</h1>
                    <p className="mt-2 text-xl max-w-prose mx-auto">{manifest.about.text}</p>
                </div>
            </div>
        </header>

        <main className="space-y-6 pb-12 mt-8">
            {manifest.blocks
                .filter(block => block.visibility === 'show')
                .sort((a,b) => a.order - b.order)
                .map(block => (
               <BlockRenderer key={block.id} block={block} design={manifest.design} setLightboxState={setLightboxState} />
            ))}
        </main>

        <footer className="mt-12 text-center text-sm text-gray-400 pb-8">
            <p>&copy; {new Date().getFullYear()}. Powered by 想い出クラウド</p>
        </footer>
      </div>
    </div>
    </>
  );
}

export default function PublicPage() {
    return (
        <Suspense fallback={
             <div className="flex min-h-screen items-center justify-center bg-gray-900">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
            </div>
        }>
            <PageContent />
        </Suspense>
    )
}
