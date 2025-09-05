'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Image, Video, X, Loader2 } from 'lucide-react';
import { uploadFile } from '@/lib/storage';

interface FileUploadProps {
  type: 'image' | 'video';
  onUploadComplete: (url: string, thumbnail?: string) => void;
  onCancel: () => void;
}

export default function FileUpload({ type, onUploadComplete, onCancel }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // ファイルタイプの検証
    if (type === 'image' && !selectedFile.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }
    if (type === 'video' && !selectedFile.type.startsWith('video/')) {
      alert('動画ファイルを選択してください');
      return;
    }

    setFile(selectedFile);

    // プレビュー生成
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      // ファイルをアップロード
      const storagePath = `uploads/${type}/${Date.now()}_${file.name}`;
      const result = await uploadFile(file, storagePath, (progress) => {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        setProgress(percent);
      });

      // 動画の場合はサムネイルを生成（簡易版）
      let thumbnail: string | undefined;
      if (type === 'video' && preview) {
        thumbnail = preview; // 実際の実装では動画のフレームを抽出
      } else if (type === 'image') {
        thumbnail = result.url;
      }

      onUploadComplete(result.url, thumbnail);
    } catch (error) {
      console.error('Upload error:', error);
      alert('アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreview(null);
    setProgress(0);
    onCancel();
  };

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-4 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">
            {type === 'image' ? '画像アップロード' : '動画アップロード'}
          </h3>
        </div>

        {!file ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="flex flex-col items-center space-y-2">
                {type === 'image' ? (
                  <Image className="w-12 h-12 text-gray-400" />
                ) : (
                  <Video className="w-12 h-12 text-gray-400" />
                )}
                <p className="text-sm text-gray-600">
                  {type === 'image' ? '画像ファイルを選択' : '動画ファイルを選択'}
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  ファイル選択
                </Button>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept={type === 'image' ? 'image/*' : 'video/*'}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* プレビュー */}
            <div className="relative">
              <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                {preview ? (
                  type === 'image' ? (
                    <img 
                      src={preview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video 
                      src={preview} 
                      className="w-full h-full object-cover"
                      controls
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {type === 'image' ? (
                      <Image className="w-12 h-12 text-gray-400" />
                    ) : (
                      <Video className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={handleCancel}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* ファイル情報 */}
            <div className="text-sm text-gray-600">
              <p><strong>ファイル名:</strong> {file.name}</p>
              <p><strong>サイズ:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>タイプ:</strong> {file.type}</p>
            </div>

            {/* アップロード進行状況 */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">アップロード中...</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">{progress}%</p>
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex space-x-2">
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    アップロード中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    アップロード
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={uploading}
              >
                キャンセル
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
