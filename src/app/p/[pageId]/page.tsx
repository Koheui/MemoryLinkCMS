
// src/app/p/[pageId]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import { PublicPage, PublicPageBlock } from '@/lib/types';
import { Globe, Phone, Mail, Link as LinkIcon, Milestone } from 'lucide-react';

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
            bgColor: "#1E293B", // Dark slate color from image
            fontScale: 1.0,
            fontFamily: "sans-serif",
            headlineFontFamily: "sans-serif",
        },
        media: {
            cover: { url: "https://placehold.co/1200x400.png", width: 1200, height: 400 },
            profile: { url: "https://placehold.co/400x400.png", width: 400, height: 400 },
        },
        ordering: "custom",
        blocks: [
          { id: '1', type: 'text', title: 'Google Drive 内の動画リンク', order: 0, visibility: 'show', icon: 'globe' },
          { id: '2', type: 'text', title: 'YouTubeの動画リンク', order: 1, visibility: 'show', icon: 'youtube' },
          { id: '3', type: 'text', title: 'TEL', order: 2, visibility: 'show', icon: 'tel' },
          { id: '4', type: 'text', title: 'MAIL', order: 3, visibility: 'show', icon: 'mail' },
          { id: '5', type: 'text', title: 'X', order: 4, visibility: 'show', icon: 'x' },
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
  youtube: <Globe className="h-6 w-6" />, // Replace with actual youtube icon if available
  tel: <Phone className="h-6 w-6" />,
  mail: <Mail className="h-6 w-6" />,
  x: <LinkIcon className="h-6 w-6" />, // Replace with actual x icon if available
  instagram: <LinkIcon className="h-6 w-6" />, // Replace with actual instagram icon if available
  album: <Milestone className="h-6 w-6" />,
  video: <Phone className="h-6 w-6" />,
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
      <main className="container mx-auto max-w-2xl p-4 md:p-0">
        <header className="mb-8 flex flex-col items-center">
          <div className="relative w-full h-40 md:h-48 rounded-lg overflow-hidden mb-[-60px]">
             <Image 
                src={manifest.media.cover.url}
                alt={manifest.title}
                fill
                priority
                data-ai-hint="background scenery"
                className="object-cover"
            />
          </div>
          <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-background shadow-lg">
                 <Image 
                    src={manifest.media.profile.url}
                    alt="Profile"
                    fill
                    data-ai-hint="portrait person"
                    className="object-cover"
                />
          </div>
          <div className="text-center mt-4">
            <h1 className="text-3xl font-bold">{manifest.title}</h1>
            <p className="text-base text-gray-300">{manifest.about.text}</p>
          </div>
        </header>

        <div className="space-y-4 px-4 pb-12">
            {manifest.blocks.map(block => (
               <a href="#" key={block.id} className="block w-full p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all transform hover:scale-[1.02]">
                    <div className="w-full bg-slate-700 rounded-md p-4 flex items-center gap-4">
                        <div className="flex-shrink-0 text-white">
                           {(blockIcons as any)[block.type] || blockIcons.default}
                        </div>
                        <div className="flex-grow text-white text-lg font-semibold text-center">
                            {block.title}
                        </div>
                         <div className="flex-shrink-0 text-white/50">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"></line><line x1="9" y1="12" x2="15" y2="12"></line><line x1="9" y1="6" x2="15" y2="6"></line></svg>
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
