// src/components/design-editor.tsx
'use client';

import { useForm, Controller } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { Memory, Asset } from '@/lib/types';
import { db, storage } from '@/lib/firebase/client';
import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { Loader2, Save } from 'lucide-react';
import Image from 'next/image';

const designSchema = z.object({
  coverAssetId: z.string().nullable(),
  profileAssetId: z.string().nullable(),
  theme: z.enum(['light', 'dark', 'cream', 'ink']),
  fontScale: z.number().min(0.8).max(1.5),
});

type DesignFormValues = z.infer<typeof designSchema>;

interface DesignEditorProps {
  memory: Memory;
  assets: Asset[];
}

export function DesignEditor({ memory, assets }: DesignEditorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});

  const form = useForm<DesignFormValues>({
    resolver: zodResolver(designSchema),
    defaultValues: {
      coverAssetId: memory.coverAssetId || '',
      profileAssetId: memory.profileAssetId || '',
      theme: memory.design?.theme || 'light',
      fontScale: memory.design?.fontScale || 1.0,
    },
  });

  useEffect(() => {
    const fetchAssetUrls = async () => {
      const urls: Record<string, string> = {};
      for (const asset of assets) {
        if (asset.storagePath) {
          try {
            const url = await getDownloadURL(ref(storage, asset.storagePath));
            urls[asset.id] = url;
          } catch (error) {
            console.error('Error getting download URL:', error);
          }
        }
      }
      setAssetUrls(urls);
    };

    if (assets.length > 0) {
      fetchAssetUrls();
    }
  }, [assets]);

  async function onSubmit(data: DesignFormValues) {
    setLoading(true);
    try {
      const memoryRef = doc(db, 'memories', memory.id);
      await updateDoc(memoryRef, {
        coverAssetId: data.coverAssetId || null,
        profileAssetId: data.profileAssetId || null,
        design: {
          theme: data.theme,
          fontScale: data.fontScale,
        },
      });
      toast({
        title: '成功',
        description: 'デザイン設定を保存しました。',
      });
    } catch (error) {
      console.error('Failed to save design settings:', error);
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: 'デザイン設定の保存に失敗しました。',
      });
    } finally {
      setLoading(false);
    }
  }

  const coverAssetId = form.watch('coverAssetId');
  const profileAssetId = form.watch('profileAssetId');
  const coverImageUrl = coverAssetId ? assetUrls[coverAssetId] : null;
  const profileImageUrl = profileAssetId ? assetUrls[profileAssetId] : null;
  const imageAssets = assets.filter(asset => asset.type === 'image');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="coverAssetId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>カバー画像</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="カバー画像を選択..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {imageAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {coverImageUrl && (
                  <div className="mt-2 rounded-md overflow-hidden aspect-video relative">
                     <Image src={coverImageUrl} alt="Cover preview" fill className="object-cover" />
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="profileAssetId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>プロフィール画像</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="プロフィール画像を選択..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {imageAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 {profileImageUrl && (
                  <div className="mt-2 rounded-full overflow-hidden relative w-32 h-32">
                     <Image src={profileImageUrl} alt="Profile preview" fill className="object-cover" />
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem>
              <FormLabel>テーマ</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="テーマを選択..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="cream">Cream</SelectItem>
                  <SelectItem value="ink">Ink</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                公開ページ全体の配色テーマを選択します。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Controller
            control={form.control}
            name="fontScale"
            render={({ field: { value, onChange } }) => (
                <FormItem>
                    <FormLabel>フォントサイズ倍率: {value.toFixed(2)}x</FormLabel>
                     <FormControl>
                        <Slider
                            value={[value]}
                            onValueChange={(values) => onChange(values[0])}
                            min={0.8}
                            max={1.5}
                            step={0.05}
                        />
                    </FormControl>
                    <FormDescription>
                        公開ページの基本フォントサイズを調整します。
                    </FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />
        
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          デザインを保存
        </Button>
      </form>
    </Form>
  );
}
