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
          <span className="text-xl font-bold">想い出リンク CMS</span>
        </Link>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">ログイン</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">
              はじめる <ArrowRight className="ml-2 h-4 w-4" />
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
                    大切な人との想い出を、永遠の形に
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    「想い出リンク」は、写真や動画、音声、そして物語を組み合わせ、美しくインタラクティブな追悼ページを作成するお手伝いをします。ユニークなリンクやNFCタグで、大切な人の記憶をいつでも鮮やかに蘇らせましょう。
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/signup">
                      想い出ページを作成する
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center">
                 <Card className="w-full max-w-md">
                   <CardHeader>
                      <CardTitle className="font-headline">デジタルの形見</CardTitle>
                      <CardDescription>
                        写真や物語などを、ひとつの共有可能なページにまとめます。
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
        <p className="text-xs text-muted-foreground">&copy; 2024 想い出リンク CMS. All rights reserved.</p>
      </footer>
    </div>
  );
}
