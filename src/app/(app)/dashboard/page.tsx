import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircle, Edit } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { Memory } from '@/lib/types';

// Mock data, in a real app this would be fetched from Firestore
const mockMemories: Memory[] = [
  {
    id: 'mem_1',
    title: 'おばあちゃんの米寿祝い',
    type: 'birth',
    status: 'published',
  },
  {
    id: 'mem_2',
    title: '愛猫ミトンの思い出',
    type: 'pet',
    status: 'draft',
  },
  {
    id: 'mem_3',
    title: '父への追悼',
    type: 'memorial',
    status: 'published',
  },
] as any;


export default function DashboardPage() {
  const memories = mockMemories; // In a real app: await fetchMemories(userId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-tight font-headline">ダッシュボード</h1>
            <p className="text-muted-foreground">作成した想い出ページ一覧</p>
        </div>
        <Button asChild>
          <Link href="/memories/new">
            <PlusCircle className="mr-2 h-4 w-4" /> 新しい想い出を作成
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {memories.map((memory) => (
          <Card key={memory.id} className="flex flex-col">
            <CardHeader>
               <div className="relative aspect-video w-full mb-4">
                 <Image 
                    src={`https://placehold.co/400x225.png`}
                    alt={memory.title}
                    data-ai-hint="memorial tribute"
                    fill
                    className="object-cover rounded-md"
                 />
               </div>
              <CardTitle className="font-headline">{memory.title}</CardTitle>
              <CardDescription>種別: <span className="capitalize">{memory.type}</span></CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
               <div className="flex items-center gap-2">
                 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    memory.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                 }`}>
                    {memory.status === 'published' ? '公開中' : '下書き'}
                 </span>
               </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/memories/${memory.id}`}>
                  <Edit className="mr-2 h-4 w-4" /> 編集
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {memories.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white font-headline">まだ想い出が作成されていません</h3>
            <p className="mt-1 text-sm text-gray-500">新しい想い出ページを作成しましょう。</p>
            <div className="mt-6">
                 <Button asChild>
                    <Link href="/memories/new">
                        <PlusCircle className="mr-2 h-4 w-4" /> 新しい想い出を作成
                    </Link>
                </Button>
            </div>
        </div>
      )}
    </div>
  );
}
