'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Save } from 'lucide-react';

interface TextEditorProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  onSave: (title: string, content: string) => void;
}

export default function TextEditor({ isOpen, onClose, title, content, onSave }: TextEditorProps) {
  const [textTitle, setTextTitle] = useState(title);
  const [textContent, setTextContent] = useState(content);

  const handleSave = () => {
    onSave(textTitle, textContent);
    onClose();
  };

  const isUrl = (text: string) => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>テキスト編集</CardTitle>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>
            手紙やメッセージを入力してください。URLを入力すると自動的にリンクになります。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="textTitle">タイトル</Label>
            <Input
              id="textTitle"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder="例: お母さんからの手紙"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="textContent">内容</Label>
            <Textarea
              id="textContent"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="手紙やメッセージの内容を入力してください..."
              rows={8}
            />
            {isUrl(textContent) && (
              <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                <p>✓ URLが検出されました。自動的にリンクとして表示されます。</p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
