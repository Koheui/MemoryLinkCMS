'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Palette, 
  Type, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface HeaderSettingsProps {
  title: string;
  description: string;
  headerStyle: {
    backgroundColor?: string;
    textColor?: string;
    titleFontSize?: 'small' | 'medium' | 'large';
    descriptionFontSize?: 'small' | 'medium' | 'large';
  };
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onStyleChange: (style: any) => void;
}

export function HeaderSettings({
  title,
  description,
  headerStyle,
  onTitleChange,
  onDescriptionChange,
  onStyleChange,
}: HeaderSettingsProps) {
  const [showStylePanel, setShowStylePanel] = useState(false);

  const getFontSize = (size?: string) => {
    switch (size) {
      case 'small': return 'text-sm';
      case 'large': return 'text-xl';
      default: return 'text-lg';
    }
  };

  const getFontSizeLabel = (size?: string) => {
    switch (size) {
      case 'small': return '小';
      case 'large': return '大';
      default: return '中';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">ヘッダー設定</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStylePanel(!showStylePanel)}
          >
            <Palette className="w-4 h-4 mr-2" />
            スタイル
            {showStylePanel ? (
              <ChevronUp className="w-4 h-4 ml-2" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-2" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* タイトル入力 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">タイトル</label>
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="想い出のタイトルを入力"
            className={`${getFontSize(headerStyle.titleFontSize)} font-semibold`}
            style={{ color: headerStyle.textColor }}
          />
        </div>

        {/* 概要入力 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">概要</label>
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="想い出の概要を入力"
            className={`${getFontSize(headerStyle.descriptionFontSize)} resize-none`}
            style={{ color: headerStyle.textColor }}
            rows={3}
          />
        </div>

        {/* スタイル設定パネル */}
        {showStylePanel && (
          <div className="border-t pt-4 space-y-4">
            {/* 背景色 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">背景色</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={headerStyle.backgroundColor || '#ffffff'}
                  onChange={(e) => onStyleChange({ ...headerStyle, backgroundColor: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={headerStyle.backgroundColor || '#ffffff'}
                  onChange={(e) => onStyleChange({ ...headerStyle, backgroundColor: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>

            {/* テキスト色 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">テキスト色</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={headerStyle.textColor || '#000000'}
                  onChange={(e) => onStyleChange({ ...headerStyle, textColor: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={headerStyle.textColor || '#000000'}
                  onChange={(e) => onStyleChange({ ...headerStyle, textColor: e.target.value })}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            {/* タイトルフォントサイズ */}
            <div className="space-y-2">
              <label className="text-sm font-medium">タイトルフォントサイズ</label>
              <div className="flex space-x-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <Button
                    key={size}
                    variant={headerStyle.titleFontSize === size ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onStyleChange({ ...headerStyle, titleFontSize: size })}
                  >
                    {getFontSizeLabel(size)}
                  </Button>
                ))}
              </div>
            </div>

            {/* 概要フォントサイズ */}
            <div className="space-y-2">
              <label className="text-sm font-medium">概要フォントサイズ</label>
              <div className="flex space-x-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <Button
                    key={size}
                    variant={headerStyle.descriptionFontSize === size ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onStyleChange({ ...headerStyle, descriptionFontSize: size })}
                  >
                    {getFontSizeLabel(size)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
