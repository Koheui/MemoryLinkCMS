'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  X, 
  Upload, 
  Image, 
  Video, 
  Music, 
  FolderOpen,
  Camera,
  FileText,
  Check
} from 'lucide-react';
import { uploadImage, uploadVideo, uploadAudio, generateFileName, getFileType } from '@/lib/storage';
import { createAsset } from '@/lib/firestore';
import { Asset } from '@/types';
import { generateVideoThumbnail, getVideoDuration, getVideoResolution } from '@/lib/utils';

interface ContentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (asset: Asset) => void;
  memoryId: string;
  contentType: 'image' | 'video' | 'audio';
}

export function ContentUploadModal({ 
  isOpen, 
  onClose, 
  onUploadComplete, 
  memoryId, 
  contentType 
}: ContentUploadModalProps) {
  const [step, setStep] = useState<'category' | 'upload'>('category');
  const [uploadingFiles, setUploadingFiles] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setSelectedFiles(acceptedFiles);
    setUploadingFiles(acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'uploading' as const,
    })));

    for (const file of acceptedFiles) {
      try {
        const fileType = getFileType(file);
        const fileName = generateFileName(file.name, fileType);
        
        let uploadResult;
        let thumbnailUrl: string | undefined;
        let duration: number | undefined;
        let resolution: { width: number; height: number } | undefined;

        switch (fileType) {
          case 'image':
            uploadResult = await uploadImage(file, memoryId, fileName);
            break;
          case 'video':
            uploadResult = await uploadVideo(file, memoryId, fileName);
            try {
              thumbnailUrl = await generateVideoThumbnail(file);
              duration = await getVideoDuration(file);
              resolution = await getVideoResolution(file);
            } catch (error) {
              console.warn('Failed to generate video thumbnail:', error);
            }
            break;
          case 'audio':
            uploadResult = await uploadAudio(file, memoryId, fileName);
            try {
              duration = await getVideoDuration(file);
            } catch (error) {
              console.warn('Failed to get audio duration:', error);
            }
            break;
          default:
            throw new Error('Unsupported file type');
        }

        const asset: Omit<Asset, 'id' | 'createdAt'> = {
          memoryId,
          ownerUid: 'mock-user-id',
          name: file.name,
          type: fileType,
          storagePath: uploadResult.path,
          url: uploadResult.url,
          thumbnailUrl,
          size: file.size,
          duration,
          resolution: resolution ? `${resolution.width}x${resolution.height}` : undefined,
          updatedAt: new Date(),
        };

        const assetId = await createAsset(asset);
        onUploadComplete({ ...asset, id: assetId, createdAt: new Date() });

        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === file 
              ? { ...f, progress: 100, status: 'success' as const }
              : f
          )
        );

      } catch (error) {
        console.error('Upload error:', error);
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === file 
              ? { ...f, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
              : f
          )
        );
      }
    }
  }, [memoryId, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.ogg'],
      'audio/*': ['.mp3', '.wav', '.ogg'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const getContentTypeInfo = () => {
    switch (contentType) {
      case 'image':
        return {
          icon: Image,
          title: '画像を追加',
          description: '写真やイラストをアップロード',
          acceptText: '画像ファイル (JPEG, PNG, GIF)',
        };
      case 'video':
        return {
          icon: Video,
          title: '動画を追加',
          description: '動画ファイルをアップロード',
          acceptText: '動画ファイル (MP4, WebM)',
        };
      case 'audio':
        return {
          icon: Music,
          title: '音声を追加',
          description: '音声ファイルをアップロード',
          acceptText: '音声ファイル (MP3, WAV)',
        };
    }
  };

  const contentTypeInfo = getContentTypeInfo();
  const Icon = contentTypeInfo.icon;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{contentTypeInfo.title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4">
          {step === 'category' ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Icon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">{contentTypeInfo.description}</p>
              </div>

              <div className="grid gap-3">
                <Button
                  variant="outline"
                  className="h-16 justify-start"
                  onClick={() => setStep('upload')}
                >
                  <Camera className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">デバイスからアップロード</div>
                    <div className="text-sm text-gray-500">カメラロールから選択</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 justify-start"
                  onClick={() => setStep('upload')}
                >
                  <FolderOpen className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">ライブラリから選択</div>
                    <div className="text-sm text-gray-500">既存のファイルから選択</div>
                  </div>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Icon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{contentTypeInfo.acceptText}</p>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                {isDragActive ? (
                  <p className="text-blue-600">ファイルをここにドロップしてください</p>
                ) : (
                  <div>
                    <p className="text-gray-600 mb-2">
                      ファイルをドラッグ&ドロップするか、タップして選択
                    </p>
                    <p className="text-sm text-gray-500">
                      最大50MBまで
                    </p>
                  </div>
                )}
              </div>

              {/* アップロード中のファイル */}
              {uploadingFiles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">アップロード中</h3>
                  {uploadingFiles.map((uploadingFile) => (
                    <div
                      key={uploadingFile.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {uploadingFile.file.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(uploadingFile.file)}
                            alt=""
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : uploadingFile.file.type.startsWith('video/') ? (
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                            <Video className="w-5 h-5 text-gray-400" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                            <Music className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{uploadingFile.file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(uploadingFile.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {uploadingFile.status === 'uploading' && (
                          <>
                            <div className="w-12 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadingFile.progress}%` }}
                              />
                            </div>
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          </>
                        )}
                        
                        {uploadingFile.status === 'success' && (
                          <Check className="w-5 h-5 text-green-600" />
                        )}
                        
                        {uploadingFile.status === 'error' && (
                          <span className="text-red-600 text-sm">{uploadingFile.error}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex space-x-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('category')}
                >
                  戻る
                </Button>
                <Button
                  className="flex-1"
                  onClick={onClose}
                  disabled={uploadingFiles.some(f => f.status === 'uploading')}
                >
                  完了
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
