import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Heart } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-headline" prefetch={false}>
          <Heart className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold">想い出リンク</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">ログイン</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">
              無料で始める
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-40 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                  大切な人との想い出を、永遠の形に。
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  「想い出リンク」は、写真や動画、音声、そして物語を組み合わせ、スマートフォンからいつでもアクセスできる美しい記念ページを作成するサービスです。ユニークなNFCタグに、大切な記憶を込めて。
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
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
            <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">サービスの主な特徴</h2>
                        <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                            直感的な操作で、心に残るページを簡単に作成・管理できます。
                        </p>
                    </div>
                </div>
                <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:max-w-none lg:grid-cols-3 pt-12">
                    <Card>
                        <CardHeader>
                            <CardTitle>かんたん編集</CardTitle>
                            <CardDescription>テキスト、写真、動画、音声を自由に組み合わせて、物語を紡ぎます。</CardDescription>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>NFC連携</CardTitle>
                            <CardDescription>物理的なカードやキーホルダーにページを紐付け、スマートフォンをかざすだけでアクセス。</CardDescription>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>安全な管理</CardTitle>
                            <CardDescription>あなただけが編集できる安全な管理画面で、大切な想い出を保護します。</CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        </section>

      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 想い出リンク. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            利用規約
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            プライバシーポリシー
          </Link>
        </nav>
      </footer>
    </div>
  );
}
