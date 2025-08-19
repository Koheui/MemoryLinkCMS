// src/components/about-editor.tsx
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Memory } from '@/lib/types';
import { db } from '@/lib/firebase/client';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Save } from 'lucide-react';

const aboutSchema = z.object({
  description: z.string().min(1, '概要を入力してください。'),
});

type AboutFormValues = z.infer<typeof aboutSchema>;

interface AboutEditorProps {
  memory: Memory;
}

export function AboutEditor({ memory }: AboutEditorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<AboutFormValues>({
    resolver: zodResolver(aboutSchema),
    defaultValues: {
      description: memory.description || '',
    },
  });

  async function onSubmit(data: AboutFormValues) {
    setLoading(true);
    try {
      const memoryRef = doc(db, 'memories', memory.id);
      await updateDoc(memoryRef, {
        description: data.description,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: '成功',
        description: '概要を保存しました。',
      });
    } catch (error) {
      console.error('Failed to save description:', error);
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '概要の保存に失敗しました。',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>概要文</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="ここに想い出のストーリーを書き留めましょう..."
                  className="min-h-[200px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                簡単なMarkdown記法が使えます。 (例: **太字**, *斜体*)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          概要を保存
        </Button>
      </form>
    </Form>
  );
}
