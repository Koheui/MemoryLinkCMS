// src/app/p/[pageId]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import { PublicPage, PublicPageBlock } from '@/lib/types';
import { Globe, Phone, Mail, Link as LinkIcon, Milestone, Youtube, GripVertical } from 'lucide-react';
import { FaXTwitter, FaInstagram, FaYoutube } from 'react-icons/fa6';


// This function fetches the static manifest.json from Firebase Storage.
// In a real implementation, this would be a direct fetch to a public URL.
async function fetchPublicPageManifest(pageId: string): Promise<PublicPage | null> {
  // This is a placeholder. In a real app, this would fetch from a URL like:
  // `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/deliver/publicPages/${pageId}/manifest.json`
  // For now, we return mock data to build the page structure.
  
  // MOCK DATA:
  if (pageId === "preview") {
    return {
        id: "preview",
        memoryId: "mockMemoryId",
        title: "岡 浩平", // From OCR
        about: {
            text: "FutureStudio株式会社 代表取締役", // From OCR
            format: "plain",
        },
        design: {
            theme: "dark", // From image
            accentColor: "#3B82F6", // Placeholder
            bgColor: "#111827", // Dark slate color from image
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
          { id: '1', type: 'text', title: 'ウェブサイト', order: 0, visibility: 'show', icon: 'globe' },
          { id: '2', type: 'text', title: 'YouTubeチャンネル', order: 1, visibility: 'show', icon: 'youtube' },
          { id: '3', type: 'text', title: '電話をかける', order: 2, visibility: 'show', icon: 'tel' },
          { id: '4', type: 'text', title: 'メールを送る', order: 3, visibility: 'show', icon: 'mail' },
          { id: '5', type: 'text', title: 'X (旧Twitter)', order: 4, visibility: 'show', icon: 'x' },
          { id: '6', type: 'text', title: 'Instagram', order: 5, visibility: 'show', icon: 'instagram' },
          { id: '7', type: 'album', title: '新婚旅行アルバム', order: 6, visibility: 'show' },
        ] as any,
        publish: {
            status: "published",
            publishedAt: new Date().toISOString(),
        }
    };
  }
  // In a real scenario, if the fetch fails, we'd return null.
  return null;
}

const blockIcons: { [key: string]: React.ReactNode } = {
  globe: <Globe className="h-6 w-6" />,
  youtube: <FaYoutube className="h-6 w-6" />, 
  tel: <Phone className="h-6 w-6" />,
  mail: <Mail className="h-6 w-6" />,
  x: <FaXTwitter className="h-5 w-5" />, 
  instagram: <FaInstagram className="h-6 w-6" />,
  album: <Milestone className="h-6 w-6" />,
  video: <Phone className="h-6 w-6" />, // This seems to be a mistake in mock data
  default: <LinkIcon className="h-6 w-6" />,
};


// Generate metadata for SEO and social sharing (OGP)
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
        backgroundColor: manifest.design.bgColor || '#F0E6FF', 
        fontFamily: manifest.design.fontFamily || 'sans-serif',
     } as React.CSSProperties}
     className="min-h-screen text-white"
     >
      <main className="container mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-12 flex flex-col items-center">
          <div className="relative mb-[-72px] h-48 w-full overflow-hidden rounded-lg md:h-56">
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
            <p className="mt-1 text-base text-gray-300">{manifest.about.text}</p>
          </div>
        </header>

        <div className="space-y-5 pb-12">
            {manifest.blocks.map(block => (
               <a href="#" key={block.id} className="group block w-full rounded-xl bg-white/5 p-2 shadow-lg ring-1 ring-white/10 backdrop-blur-sm transition-all duration-300 ease-in-out hover:scale-[1.03] hover:bg-white/10 hover:shadow-2xl hover:ring-white/20">
                    <div className="flex items-center gap-4 rounded-lg bg-transparent p-3">
                        <div className="flex-shrink-0 text-white">
                           {(blockIcons as any)[block.icon] || blockIcons.default}
                        </div>
                        <div className="flex-grow text-center text-lg font-semibold text-white">
                            {block.title}
                        </div>
                         <div className="flex-shrink-0 text-white/30 group-hover:text-white/60">
                            <GripVertical className="h-6 w-6" />
                        </div>
                    </div>
                </a>
            ))}
        </div>

        <footer className="mt-12 text-center text-sm text-gray-400 pb-8">
            <p>&copy; {new Date().getFullYear()}. Powered by MemoryLink</p>
        </footer>
      </main>
    </div>
  );
}
