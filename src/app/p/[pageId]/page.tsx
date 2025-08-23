// src/app/p/[pageId]/page.tsx
'use client';
import { useState, useEffect } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { PublicPage, PublicPageBlock, Memory, Design } from '@/lib/types';
import { Globe, Phone, Mail, Link as LinkIcon, Music, Clapperboard, Milestone, Camera, Loader2 } from 'lucide-react';
import { FaXTwitter, FaInstagram, FaYoutube } from 'react-icons/fa6';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';


// This function now only fetches the static manifest for production builds.
// For preview, we'll use localStorage.
async function fetchPublicPageManifest(pageId: string): Promise<PublicPage | null> {
  // In a real production environment, you might want to get the bucket name from an env var.
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
      console.error("Firebase Storage bucket name is not configured.");
      return null;
  }
  // Production fetch from Storage
  try {
    const res = await fetch(`https://storage.googleapis.com/${bucketName}/deliver/publicPages/${pageId}/manifest.json`, { next: { revalidate: 300 }});
    if (!res.ok) {
        console.error(`Failed to fetch manifest for ${pageId}: ${res.statusText}`);
        return null;
    }
    const data = await res.json();
    return data as PublicPage;
  } catch(error) {
     console.error(`Error fetching or parsing manifest for ${pageId}:`, error);
     return null;
  }
}

// Convert Memory to PublicPage for rendering. This is used for previewing.
// It tries to construct a PublicPage object from a Memory object.
function convertMemoryToPublicPage(memory: Memory): PublicPage {
    return {
        id: memory.id,
        memoryId: memory.id,
        title: memory.title,
        about: {
            text: memory.description,
            format: 'plain'
        },
        design: memory.design,
        media: {
            // @ts-ignore - these are added dynamically from editor in handlePreview
            cover: { url: memory.media?.cover?.url || "https://placehold.co/1200x480.png" },
             // @ts-ignore
            profile: { url: memory.media?.profile?.url || "https://placehold.co/400x400.png" },
        },
        ordering: 'custom',
        blocks: memory.blocks,
        publish: {
            status: 'published',
            publishedAt: new Date(),
        },
    };
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

const BlockRenderer = ({ block }: { block: PublicPageBlock }) => {
    switch (block.type) {
        case 'album':
            return (
                <Card className="overflow-hidden bg-white/5 border-white/10 shadow-lg">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                           <Milestone className="h-5 w-5 text-gray-300" />
                           <h3 className="font-semibold text-white">{block.title}</h3>
                        </div>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-4">
                        <Carousel opts={{ loop: true, align: "start" }} className="w-full">
                            <CarouselContent className="-ml-2">
                                {block.album?.items?.map((item, index) => (
                                    <CarouselItem key={index} className="pl-2 md:basis-1/2">
                                        <div className="aspect-video relative rounded-lg overflow-hidden">
                                           {item.src && <Image src={item.src} alt={block.title || `Album image ${index+1}`} fill className="object-cover" />}
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className="ml-14 hidden sm:flex" />
                            <CarouselNext className="mr-14 hidden sm:flex" />
                        </Carousel>
                    </CardContent>
                </Card>
            );
        case 'photo':
             return (
                 <Card className="overflow-hidden bg-white/5 border-white/10 shadow-lg">
                    {block.photo?.src && (
                         <div className="aspect-video relative w-full">
                             <Image src={block.photo.src} alt={block.title || "Single photo"} fill className="object-cover" />
                         </div>
                    )}
                    <CardContent className="p-4">
                        <h3 className="font-semibold text-white">{block.title}</h3>
                        {block.photo?.caption && <p className="text-sm text-gray-300 mt-1">{block.photo.caption}</p>}
                    </CardContent>
                </Card>
            );
        case 'video':
            return (
                 <Card className="overflow-hidden bg-white/5 border-white/10 shadow-lg group">
                    <div className="aspect-video relative w-full bg-black">
                        {block.video?.poster ? (
                             <Image src={block.video.poster} alt={block.title || "Video thumbnail"} fill className="object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                        ) : <div className="w-full h-full bg-black flex items-center justify-center"><Clapperboard className="h-16 w-16 text-white/70" /></div>}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Clapperboard className="h-16 w-16 text-white/70" />
                        </div>
                    </div>
                    <CardContent className="p-4">
                        <h3 className="font-semibold text-white">{block.title}</h3>
                    </CardContent>
                </Card>
            );
        case 'audio':
              return (
                 <Card className="flex items-center gap-4 p-4 bg-white/5 border-white/10 shadow-lg">
                    <div className="flex-shrink-0">
                        <Music className="h-8 w-8 text-gray-300" />
                    </div>
                    <div className="flex-grow">
                        <h3 className="font-semibold text-white">{block.title}</h3>
                    </div>
                    <div className="flex-shrink-0">
                       <Badge variant="outline" className="text-white/70 border-white/20">再生</Badge>
                    </div>
                </Card>
            );
        case 'text':
             return (
               <a href="#" className="group block w-full rounded-xl bg-white/5 p-2 shadow-lg ring-1 ring-white/10 backdrop-blur-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:bg-white/10 hover:shadow-2xl hover:ring-white/20">
                    <div className="flex items-center gap-4 rounded-lg bg-transparent p-3">
                        <div className="flex-shrink-0 text-white">
                           {blockIcons[block.icon || 'default'] || blockIcons.default}
                        </div>
                        <div className="flex-grow text-center text-lg font-semibold text-white">
                            {block.title}
                        </div>
                         <div className="flex-shrink-0 text-white/30 transition-transform group-hover:text-white/60 group-hover:translate-x-1">
                            <LinkIcon className="h-5 w-5" />
                        </div>
                    </div>
                </a>
            );
        default:
            return null;
    }
}


export default function PublicPage({ params }: { params: { pageId: string } }) {
  const [manifest, setManifest] = useState<PublicPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPageData() {
        setLoading(true);
        let pageData: PublicPage | null = null;

        if (params.pageId === 'preview') {
            const storedPreviewData = localStorage.getItem('memory-preview');
            if (storedPreviewData) {
                try {
                    // The data in localStorage is already in the final `PublicPage` shape.
                    const parsedData = JSON.parse(storedPreviewData);
                    pageData = convertMemoryToPublicPage(parsedData);
                } catch(e) {
                    console.error("Failed to parse preview data from localStorage", e);
                }
            }
        } else {
            pageData = await fetchPublicPageManifest(params.pageId);
        }

        if (pageData) {
            document.title = `${pageData.title} - 想い出リンク`;
        }
        setManifest(pageData);
        setLoading(false);
    }
    
    loadPageData();
  }, [params.pageId]);

  if (loading) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
    )
  }

  if (!manifest) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white text-center p-4">
            <h1 className="text-2xl font-bold">ページが見つかりません</h1>
            <p className="mt-2 text-gray-300">
                {params.pageId === 'preview' 
                    ? 'プレビューデータが見つかりませんでした。編集画面から再度プレビューボタンを押してください。'
                    : 'この想い出ページは存在しないか、まだ公開されていません。'}
            </p>
        </div>
    );
  }

  return (
    <div style={{ 
        backgroundColor: manifest.design.bgColor || '#111827', 
        fontFamily: manifest.design.fontFamily || 'sans-serif',
     } as React.CSSProperties}
     className="min-h-screen text-white"
     >
      <div className="container mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-12 flex flex-col items-center">
          <div className="relative h-48 w-full overflow-hidden rounded-xl shadow-lg md:h-56">
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
          <div className="relative -mt-[72px] mb-4 h-36 w-36 overflow-hidden rounded-full border-4 border-gray-900/50 shadow-lg backdrop-blur-sm md:-mt-20 md:h-40 md:w-40">
                 <Image 
                    src={manifest.media.profile.url}
                    alt="Profile"
                    fill
                    data-ai-hint="portrait person"
                    className="object-cover"
                    sizes="160px"
                />
          </div>
          <div className="mt-4 text-center">
            <h1 className="text-3xl font-bold sm:text-4xl">{manifest.title}</h1>
            <p className="mt-2 text-base text-gray-300 max-w-prose">{manifest.about.text}</p>
          </div>
        </header>

        <main className="space-y-6 pb-12">
            {manifest.blocks
                .filter(block => block.visibility === 'show')
                .sort((a,b) => a.order - b.order)
                .map(block => (
               <BlockRenderer key={block.id} block={block} />
            ))}
        </main>

        <footer className="mt-12 text-center text-sm text-gray-400 pb-8">
            <p>&copy; {new Date().getFullYear()}. Powered by MemoryLink</p>
        </footer>
      </div>
    </div>
  );
}
