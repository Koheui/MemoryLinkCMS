import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Heart } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="#" className="flex items-center gap-2 font-headline" prefetch={false}>
          <Heart className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">MemoryLink CMS</span>
        </Link>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-primary/10">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline text-primary">
                    Create Lasting Tributes for Your Loved Ones
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    MemoryLink helps you build beautiful, interactive memorial pages with photos, videos, audio, and stories. Share a unique link or an NFC tag to keep their memory alive.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/signup">
                      Create a Memory Page
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center">
                 <Card className="w-full max-w-md">
                   <CardHeader>
                      <CardTitle className="font-headline">A Digital Keepsake</CardTitle>
                      <CardDescription>
                        Combine photos, stories, and more into a single, shareable page.
                      </CardDescription>
                   </CardHeader>
                   <CardContent>
                      <div className="relative aspect-video w-full">
                         <img
                           src="https://placehold.co/600x400.png"
                           alt="Memory page preview"
                           data-ai-hint="memorial collage"
                           className="object-cover rounded-lg"
                         />
                      </div>
                   </CardContent>
                 </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 MemoryLink CMS. All rights reserved.</p>
      </footer>
    </div>
  );
}
