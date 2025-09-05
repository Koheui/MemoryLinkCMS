'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Memory, PRODUCT_TYPE_NAMES } from '@/types';
import { createMemory } from '@/lib/firestore';
import { Loader2, CheckCircle } from 'lucide-react';

interface MemoryCreationFormProps {
  claimInfo: any;
  onSuccess: (memoryId: string) => void;
  onError: (error: string) => void;
}

export default function MemoryCreationForm({ claimInfo, onSuccess, onError }: MemoryCreationFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('=== Memory Creation Process Start ===');
      console.log('Claim info:', claimInfo);
      console.log('Form data:', formData);

      // 基本的なバリデーション
      if (!claimInfo || !claimInfo.tenant) {
        throw new Error('Invalid claim info: missing tenant');
      }

      const newMemory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'> = {
        ownerUid: claimInfo.claimedByUid || 'temp',
        tenant: claimInfo.tenant,
        title: formData.title || '新しい想い出',
        type: 'personal',
        status: 'draft',
        description: formData.description,
        design: {
          theme: 'default',
          layout: 'standard',
          colors: {
            primary: '#3B82F6',
            secondary: '#6B7280',
            background: '#FFFFFF',
          },
        },
        blocks: [
          {
            id: '1',
            type: 'text',
            content: formData.description,
            order: 1,
            visibility: 'public',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        metadata: {
          source: 'lp-form',
          lpId: claimInfo.lpId,
          productType: claimInfo.productType,
        },
      };

      console.log('Memory object to create:', newMemory);

      // Firestore作成を一時的に無効化してテスト
      console.log('Firestore creation disabled for testing');
      const memoryId = 'test-memory-' + Date.now();
      console.log('Generated test memory ID:', memoryId);
      
      // 実際のFirestore作成をコメントアウト
      // const memoryId = await createMemory(newMemory);
      
      console.log('Memory creation successful:', memoryId);
      console.log('=== Memory Creation Process End ===');
      onSuccess(memoryId);
    } catch (error) {
      console.error('=== Memory Creation Error ===');
      console.error('Error details:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('=== End Error ===');
      
      // より詳細なエラーメッセージ
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onError(`想い出ページの作成に失敗しました: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl text-center text-gray-800">
          新しいページの作成
        </CardTitle>
        <CardDescription className="text-center text-gray-600">
          たくさん想い出を保存しましょう
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">タイトル（後から変更できます）</Label>
            <Input
              id="title"
              placeholder="例：成長の記録"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明（後から変更できます）</Label>
            <Textarea
              id="description"
              placeholder="素敵な想い出を自由に書いてください..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                作成中...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                ページを作成
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
