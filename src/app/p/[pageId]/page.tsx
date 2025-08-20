// src/app/p/[pageId]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { PublicPage, PublicPageBlock, Asset } from '@/lib/types';
import { Globe, Phone, Mail, Link as LinkIcon, Music, Clapperboard, Milestone } from 'lucide-react';
import { FaXTwitter, FaInstagram, FaYoutube } from 'react-icons/fa6';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';


// This function fetches the static manifest.json from Firebase Storage.
async function fetchPublicPageManifest(pageId: string): Promise<PublicPage | null> {
  if (pageId === "preview") {
    // MOCK DATA for local development and previewing
    return {
        id: "preview",
        memoryId: "mockMemoryId",
        title: "岡 浩平",
        about: {
            text: "FutureStudio株式会社 代表取締役。大切な人との想い出を、永遠の形に残すお手伝いをします。NFCタグに想い出を込めて、いつでもどこでも、スマートフォンをかざすだけで、大切な記憶が鮮やかに蘇ります。",
            format: "plain",
        },
        design: {
            theme: "dark",
            accentColor: "#3B82F6",
            bgColor: "#111827",
            fontScale: 1.0,
            fontFamily: "sans-serif",
            headlineFontFamily: "sans-serif",
        },
        media: {
            cover: { url: "https://placehold.co/1200x480.png", width: 1200, height: 480 },
            profile: { url: "https://placehold.co/400x400.png", width: 400, height: 400 },
        },
        ordering: "custom",
        blocks: [
          { id: '1', type: 'text', title: 'ウェブサイト', icon: 'globe', visibility: 'show', order: 0 },
          { id: '2', type: 'text', title: 'YouTubeチャンネル', icon: 'youtube', visibility: 'show', order: 1 },
          { id: '7', type: 'album', title: '新婚旅行アルバム', order: 2, visibility: 'show', album: { layout: 'carousel', assetIds: ['a1','a2','a3'], items: [
            { src: 'https://placehold.co/600x400.png' }, { src: 'https://placehold.co/600x400.png' }, { src: 'https://placehold.co/600x400.png' }
          ]}},
          { id: '8', type: 'photo', title: 'お気に入りの一枚', order: 3, visibility: 'show', photo: { assetId: 'p1', src: 'https://placehold.co/600x400.png', caption: '夕焼けのビーチで' }},
          { id: '9', type: 'video', title: '子供の発表会', order: 4, visibility: 'show', video: { assetId: 'v1', src: 'https://placehold.co/600x400.png' } },
          { id: '10', type: 'audio', title: '祖母の思い出話', order: 5, visibility: 'show', audio: { assetId: 'au1', src: '' } },
          { id: '5', type: 'text', title: 'X (旧Twitter)', icon: 'x', visibility: 'show', order: 6 },
          { id: '6', type: 'text', title: 'Instagram', icon: 'instagram', visibility: 'show', order: 7 },
        ] as any,
        publish: {
            status: "published",
            publishedAt: new Date().toISOString(),
        }
    };
  }

  try {
    const res = await fetch(`https://storage.googleapis.com/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/deliver/publicPages/${pageId}/manifest.json`, { next: { revalidate: 300 }}); // Revalidate every 5 minutes
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
                <Card className="overflow-hidden bg-white/5 border-white/10">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                           <Milestone className="h-5 w-5 text-gray-300" />
                           <h3 className="font-semibold text-white">{block.title}</h3>
                        </div>
                    </CardHeader>
                    <CardContent className="px-2">
                        <Carousel opts={{ loop: true, align: "start" }} className="w-full">
                            <CarouselContent className="-ml-2">
                                {block.album?.items?.map((item, index) => (
                                    <CarouselItem key={index} className="pl-2 md:basis-1/2">
                                        <div className="aspect-video relative rounded-md overflow-hidden">
                                           <Image src={item.src} alt={block.title || `Album image ${index+1}`} fill className="object-cover" />
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className="ml-14" />
                            <CarouselNext className="mr-14" />
                        </Carousel>
                    </CardContent>
                </Card>
            );
        case 'photo':
             return (
                 <Card className="overflow-hidden bg-white/5 border-white/10">
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
                 <Card className="overflow-hidden bg-white/5 border-white/10 group">
                    <div className="aspect-video relative w-full bg-black">
                        {block.video?.src && (
                             <Image src={block.video.src} alt={block.title || "Video thumbnail"} fill className="object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                        )}
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
                 <Card className="flex items-center gap-4 p-4 bg-white/5 border-white/10">
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


export async function generateMetadata({ params }: { params: { pageId: string } }): Promise<Metadata> {
  const manifest = await fetchPublicPageManifest(params.pageId);

  if (!manifest) {
    return {
      title: 'ページが見つかりません',
    };
  }

  return {
    title: `${manifest.title} - 想い出リンク`,
    description: manifest.about.text.substring(0, 160),
    openGraph: {
      title: manifest.title,
      description: manifest.about.text.substring(0, 160),
      images: [
        {
          url: manifest.media.cover.url,
          width: manifest.media.cover.width,
          height: manifest.media.cover.height,
          alt: manifest.title,
        },
      ],
      type: 'profile',
    },
    twitter: {
        card: 'summary_large_image',
        title: manifest.title,
        description: manifest.about.text.substring(0, 160),
        images: [manifest.media.cover.url],
    }
  };
}


export default async function PublicPage({ params }: { params: { pageId: string } }) {
  const manifest = await fetchPublicPageManifest(params.pageId);

  if (!manifest) {
    notFound();
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
          <div className="relative mb-[-72px] h-48 w-full overflow-hidden rounded-xl shadow-lg md:h-56">
             <Image 
                src={manifest.media.cover.url}
                alt={manifest.title}
                fill
                priority
                data-ai-hint="background scenery"
                className="object-cover"
            />
          </div>
          <div className="relative h-36 w-36 overflow-hidden rounded-full border-4 border-gray-900/50 shadow-lg backdrop-blur-sm md:h-40 md:w-40">
                 <Image 
                    src={manifest.media.profile.url}
                    alt="Profile"
                    fill
                    data-ai-hint="portrait person"
                    className="object-cover"
                />
          </div>
          <div className="mt-5 text-center">
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
