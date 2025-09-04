'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, Image, Video, MessageSquare, Save } from 'lucide-react';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

interface MemoryData {
  title: string;
  description: string;
  type: 'acrylic';
  status: 'draft' | 'published';
  design: {
    theme: string;
    fontScale: number;
  };
  blocks: any[];
}

export default function CreateMemoryPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memoryData, setMemoryData] = useState<MemoryData>({
    title: '',
    description: '',
    type: 'acrylic',
    status: 'draft',
    design: {
      theme: 'default',
      fontScale: 1.0,
    },
    blocks: [],
  });

  const handleInputChange = (field: keyof MemoryData, value: any) => {
    setMemoryData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    try {
      const storageRef = ref(storage, `memories/${currentUser?.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      const block = {
        type,
        content: downloadURL,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date(),
        },
      };
      
      setMemoryData(prev => ({
        ...prev,
        blocks: [...prev.blocks, block],
      }));
    } catch (err: any) {
      console.error('File upload error:', err);
      setError('ファイルのアップロードに失敗しました');
    }
  };

  const handleSave = async () => {
    if (!currentUser) {
      setError('認証が必要です');
      return;
    }

    if (!memoryData.title.trim()) {
      setError('タイトルを入力してください');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const memoryRef = await addDoc(collection(db, 'memories'), {
        ownerUid: currentUser.uid,
        tenant: 'petmem', // デフォルトテナント
        lpId: 'default',
        ...memoryData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('Memory created:', memoryRef.id);
      router.push(`/memories/${memoryRef.id}`);
    } catch (err: any) {
      console.error('Save error:', err);
      setError('保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-center text-red-600">認証が必要です</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">想い出ページ作成</h1>
            <p className="text-gray-600">新しい想い出ページを作成します</p>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            保存
          </Button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
              <CardDescription>
                想い出ページの基本情報を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">タイトル *</Label>
                <Input
                  id="title"
                  value={memoryData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="想い出のタイトル"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={memoryData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="想い出についての説明"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="theme">テーマ</Label>
                <select
                  id="theme"
                  value={memoryData.design.theme}
                  onChange={(e) => handleInputChange('design', { ...memoryData.design, theme: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="default">デフォルト</option>
                  <option value="warm">暖かい</option>
                  <option value="cool">涼しい</option>
                  <option value="vintage">レトロ</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* メディアアップロード */}
          <Card>
            <CardHeader>
              <CardTitle>メディア</CardTitle>
              <CardDescription>
                写真や動画をアップロードしてください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>画像アップロード</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'image');
                    }}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload">
                    <Button variant="outline" className="w-full">
                      <Image className="w-4 h-4 mr-2" />
                      画像を選択
                    </Button>
                  </label>
                </div>
              </div>

              <div>
                <Label>動画アップロード</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'video');
                    }}
                    className="hidden"
                    id="video-upload"
                  />
                  <label htmlFor="video-upload">
                    <Button variant="outline" className="w-full">
                      <Video className="w-4 h-4 mr-2" />
                      動画を選択
                    </Button>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* アップロードされたメディアの表示 */}
        {memoryData.blocks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>アップロード済みメディア</CardTitle>
              <CardDescription>
                アップロードされた画像・動画の一覧
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {memoryData.blocks.map((block, index) => (
                  <div key={index} className="border rounded-lg p-2">
                    {block.type === 'image' ? (
                      <img
                        src={block.content}
                        alt={`Image ${index + 1}`}
                        className="w-full h-32 object-cover rounded"
                      />
                    ) : (
                      <video
                        src={block.content}
                        className="w-full h-32 object-cover rounded"
                        controls
                      />
                    )}
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {block.metadata.fileName}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
