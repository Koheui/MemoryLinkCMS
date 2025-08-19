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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';

const newMemorySchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters.'),
  type: z.enum(['pet', 'birth', 'memorial', 'other'], {
    required_error: 'You need to select a memory type.',
  }),
  // notes: z.string().optional(),
  // photos: z.any().refine((files) => files?.length >= 1, 'At least one photo is required.'),
});

type NewMemoryFormValues = z.infer<typeof newMemorySchema>;

export default function NewMemoryPage() {
  const form = useForm<NewMemoryFormValues>({
    resolver: zodResolver(newMemorySchema),
    defaultValues: {
      title: '',
    },
  });

  function onSubmit(data: NewMemoryFormValues) {
    console.log(data);
    // TODO: Firestore integration
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Create a New Memory</h1>
        <p className="text-muted-foreground">
          Let's start by telling us a bit about your memory. This is the first step of your order.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">1. Memory Details</CardTitle>
              <CardDescription>
                This information will be used to create your memory page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Memory Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Grandma's 80th Birthday" {...field} />
                      </FormControl>
                      <FormDescription>
                        This will be the main headline of your memory page.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Memory Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pet">Pet</SelectItem>
                          <SelectItem value="birth">Birth</SelectItem>
                          <SelectItem value="memorial">Memorial</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This helps us categorize your memory.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="font-headline">2. Upload Assets</CardTitle>
                <CardDescription>
                    Upload photos, videos, or audio that are part of this memory. You can add more later.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <FormItem>
                    <FormLabel>Photos & Videos</FormLabel>
                    <FormControl>
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-muted-foreground">Upload 5-10 photos to start</p>
                            </div>
                            <Input id="dropzone-file" type="file" className="hidden" multiple />
                        </label>
                    </div> 
                    </FormControl>
                    <FormMessage />
                </FormItem>
            </CardContent>
          </Card>

          <Button type="submit" size="lg">Create Memory & Continue</Button>
        </form>
      </Form>
    </div>
  );
}
