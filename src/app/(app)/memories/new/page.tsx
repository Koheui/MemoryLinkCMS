// src/app/(app)/memories/new/page.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2 } from 'lucide-react';
import { auth, db, storage } from '@/lib/firebase/client';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import Image from 'next/image';

const newMemorySchema = z.object({
  title: z.string().min(2, 'タイトルは2文字以上で入力してください。'),
  photos: z
    .custom<FileList>()
    .refine((files) => files?.length >= 1, '写真は1枚以上選択してください。')
    .refine((files) => files?.length <= 10, '写真のアップロードは10枚までです。'),
});

type NewMemoryFormValues = z.infer<typeof newMemorySchema>;

export default function NewMemoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const form = useForm<NewMemoryFormValues>({
    resolver: zodResolver(newMemorySchema),
    defaultValues: {
      title: '',
    },
  });
  
  const photoFiles = form.watch('photos');

  useEffect(() => {
    if (photoFiles && photoFiles.length > 0) {
      const newPreviews = Array.from(photoFiles).map((file) => URL.createObjectURL(file));
      setPhotoPreviews(newPreviews);
      
      // Cleanup function to revoke Object URLs
      return () => {
        newPreviews.forEach(URL.revokeObjectURL);
      };
    } else {
      setPhotoPreviews([]);
    }
  }, [photoFiles]);

  async function onSubmit(data: NewMemoryFormValues) {
    if (!user) {
        toast({ variant: 'destructive', title: 'エラー', description: 'ログインしていません。' });
        return;
    }

    setLoading(true);

    try {
        // 1. Create Memory document
        const memoryDocRef = await addDoc(collection(db, 'memories'), {
            ownerUid: user.uid,
            title: data.title,
            status: 'draft',
            publicPageId: null,
            coverAssetId: null,
            profileAssetId: null,
            description: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        const memoryId = memoryDocRef.id;

        // 2. Upload photos to Storage and create Asset documents
        const assetPromises = Array.from(data.photos).map(async (file) => {
            const filePath = `raw/users/${user.uid}/memories/${memoryId}/uploads/${Date.now()}_${file.name}`;
            const fileRef = ref(storage, filePath);
            await uploadBytes(fileRef, file, { contentType: file.type });

            await addDoc(collection(db, 'memories', memoryId, 'assets'), {
                ownerUid: user.uid, // Add ownerUid for collectionGroup queries
                type: file.type.startsWith('image/') ? 'image' : 
                      file.type.startsWith('video/') ? 'video' : 'audio',
                name: file.name,
                rawPath: filePath,
                size: file.size, // Add file size
                createdAt: serverTimestamp(),
            });
        });
        await Promise.all(assetPromises);
        
        // 3. Create Order document
        await addDoc(collection(db, 'orders'), {
            userUid: user.uid,
            memoryId: memoryId,
            status: 'assets_uploaded',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        toast({ title: '想い出を作成しました', description: '最初のステップが完了しました。' });
        router.push(`/memories/${memoryId}`);

    } catch (error) {
        console.error("Failed to create memory:", error);
        toast({ variant: 'destructive', title: 'エラー', description: '想い出の作成に失敗しました。' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">新しい想い出を作成</h1>
        <p className="text-muted-foreground">
          最初のステップとして、想い出の基本情報を入力してください。
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. 想い出の詳細</CardTitle>
              <CardDescription>
                この情報が、あなたの「想い出ページ」の基本となります。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>想い出のタイトル</FormLabel>
                      <FormControl>
                        <Input placeholder="例：おばあちゃんの米寿のお祝い" {...field} />
                      </FormControl>
                      <FormDescription>
                        これが想い出ページのメインの見出しになります。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>2. アセットのアップロード</CardTitle>
                <CardDescription>
                    この想い出に関連する写真、動画、音声をアップロードします。後から追加することも可能です。
                </CardDescription>
            </Header>
            <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="photos"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>写真・動画</FormLabel>
                      <FormControl>
                      <div className="flex items-center justify-center w-full">
                          <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                  <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">クリックしてアップロード</span> またはドラッグ＆ドロップ</p>
                                  <p className="text-xs text-muted-foreground">まず5〜10枚の写真をアップロードしてください</p>
                              </div>
                              <Input 
                                id="dropzone-file" 
                                type="file" 
                                className="hidden" 
                                multiple 
                                accept="image/*,video/*"
                                onChange={(e) => field.onChange(e.target.files)}
                              />
                          </label>
                      </div> 
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
                />
                 {photoPreviews.length > 0 && (
                    <div>
                        <p className="font-medium text-sm mb-2">プレビュー:</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                            {photoPreviews.map((src, index) => (
                                <div key={index} className="relative aspect-square">
                                    <Image
                                        src={src}
                                        alt={`Preview ${index + 1}`}
                                        fill
                                        className="rounded-md object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
          </Card>

          <Button type="submit" size="lg" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            想い出を作成して次へ
          </Button>
        </form>
      </Form>
    </div>
  );
}
