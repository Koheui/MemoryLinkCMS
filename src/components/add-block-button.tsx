'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Plus, 
  Type, 
  Image, 
  Video, 
  Album,
  ChevronDown
} from 'lucide-react';

interface AddBlockButtonProps {
  onAddBlock: (type: 'text' | 'image' | 'video' | 'album') => void;
}

export function AddBlockButton({ onAddBlock }: AddBlockButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const blockTypes = [
    { type: 'text' as const, icon: Type, label: 'テキスト', description: 'メッセージを追加' },
    { type: 'image' as const, icon: Image, label: '画像', description: '写真を追加' },
    { type: 'video' as const, icon: Video, label: '動画', description: '動画を追加' },
    { type: 'album' as const, icon: Album, label: 'アルバム', description: 'アルバムを追加' },
  ];

  const handleAddBlock = (type: 'text' | 'image' | 'video' | 'album') => {
    onAddBlock(type);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-12 border-2 border-dashed border-gray-300 hover:border-gray-400 bg-transparent text-gray-600 hover:text-gray-800"
      >
        <Plus className="w-5 h-5 mr-2" />
        コンテンツを追加
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-10">
          <CardContent className="p-2">
            <div className="grid gap-1">
              {blockTypes.map(({ type, icon: Icon, label, description }) => (
                <Button
                  key={type}
                  variant="ghost"
                  className="justify-start h-auto p-3"
                  onClick={() => handleAddBlock(type)}
                >
                  <Icon className="w-5 h-5 mr-3 text-gray-600" />
                  <div className="text-left">
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-gray-500">{description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
