// src/app/p/[pageId]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import { PublicPage, PublicPageBlock } from '@/lib/types';

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
        title: "おばあちゃんの米寿のお祝い",
        about: {
            text: "これは、家族みんなでお祝いした、おばあちゃんの88歳の誕生日の記録です。たくさんの笑顔と、美味しいご馳走に囲まれて、本当に幸せな一日でした。",
            format: "plain",
        },
        design: {
            theme: "light",
            accentColor: "#8A2BE2",
            bgColor: "#F5F5F5",
            fontScale: 1.0,
            fontFamily: "Literata",
            headlineFontFamily: "Poppins",
        },
        media: {
            cover: { url: "https://placehold.co/1200x630.png", width: 1200, height: 630 },
            profile: { url: "https://placehold.co/400x400.png", width: 400, height: 400 },
        },
        ordering: "custom",
        blocks: [],
        publish: {
            status: "published",
            publishedAt: new Date().toISOString(),
        }
    };
  }
  // In a real scenario, if the fetch fails, we'd return null.
  return null;
}


// Generate metadata for SEO and social sharing (OGP)
export async function generateMetadata({ params }: { params: { pageId: string } }): Promise<Metadata> {
  const manifest = await fetchPublicPageManifest(params.pageId);

  if (!manifest) {
    return {
      title: '想い出ページが見つかりません',
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
      type: 'article',
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

  // TODO: Render blocks based on manifest.blocks array

  return (
    // The inline styles will be replaced by a proper theme system later
    <div style={{ 
        backgroundColor: manifest.design.bgColor, 
        fontFamily: manifest.design.fontFamily,
        '--font-scale': manifest.design.fontScale,
        '--headline-font': manifest.design.headlineFontFamily
     } as React.CSSProperties}
     className="min-h-screen"
     >
      <main className="container mx-auto max-w-2xl p-4 md:p-8">
        <header className="mb-8">
          <div className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden mb-4">
             <Image 
                src={manifest.media.cover.url}
                alt={manifest.title}
                fill
                priority
                data-ai-hint="memorial event"
                className="object-cover"
            />
          </div>
          <div className="flex items-center gap-4">
             <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-[var(--background-color)] -mt-12">
                 <Image 
                    src={manifest.media.profile.url}
                    alt="Profile"
                    fill
                    data-ai-hint="portrait elderly"
                    className="object-cover"
                />
             </div>
             <div>
                <h1 className="text-3xl md:text-4xl font-bold" style={{fontFamily: 'var(--headline-font)'}}>{manifest.title}</h1>
             </div>
          </div>
        </header>

        <Card className="mb-8">
            <CardHeader>
                 <CardTitle style={{fontFamily: 'var(--headline-font)'}}>はじめに</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="whitespace-pre-wrap text-base leading-relaxed">{manifest.about.text}</p>
            </CardContent>
        </Card>

        {/* This is where content blocks will be rendered in the future */}
        <div className="space-y-6">
            <Card>
                 <CardHeader>
                    <CardTitle style={{fontFamily: 'var(--headline-font)'}}>1歳の誕生日 (アルバムブロック)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <Image src="https://placehold.co/400x400.png" alt="album photo" width={400} height={400} className="rounded-md" data-ai-hint="first birthday" />
                         <Image src="https://placehold.co/400x400.png" alt="album photo" width={400} height={400} className="rounded-md" data-ai-hint="baby smiling" />
                         <Image src="https://placehold.co/400x400.png" alt="album photo" width={400} height={400} className="rounded-md" data-ai-hint="birthday cake" />
                    </div>
                </CardContent>
            </Card>
             <Card>
                 <CardHeader>
                    <CardTitle style={{fontFamily: 'var(--headline-font)'}}>メッセージ (テキストブロック)</CardTitle>
                </CardHeader>
                <CardContent>
                     <p className="whitespace-pre-wrap text-base leading-relaxed">
                        たくさんの人に愛されて、元気に育ってね。
                     </p>
                </CardContent>
            </Card>
        </div>

        <footer className="mt-12 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} {manifest.title}. Powered by 想い出リンク.</p>
        </footer>
      </main>
    </div>
  );
}
