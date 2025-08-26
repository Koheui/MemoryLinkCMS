// src/components/media-uploader.tsx
'use client';
import React, { useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast, toast } from '@/hooks/use-toast';
import { storage, db } from '@/lib/firebase/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Asset } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface MediaUploaderProps {
  onUploadSuccess: (asset: Asset) => void;
  memoryId?: string | null;
  children?: React.ReactNode;
  accept: string;
  assetType: 'image' | 'video' | 'audio';
}

const generateVideoThumbnail = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);
        video.muted = true;
        video.playsInline = true;

        const cleanup = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('error', onError);
            URL.revokeObjectURL(video.src);
        };

        const onLoadedMetadata = () => {
             // Use a small timeout to give browser time to calculate video dimensions
            setTimeout(() => {
                if (video.videoWidth === 0 || video.videoHeight === 0) {
                     console.warn('Video dimensions not available after loadedmetadata.');
                     // Fallback or try seeking anyway
                }
                video.currentTime = Math.min(1, video.duration / 2); // Seek to 1s or midpoint
            }, 100);
        };

        const onSeeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                cleanup();
                return reject(new Error('Could not get 2D context from canvas.'));
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                cleanup();
                if (!blob) {
                    return reject(new Error('Canvas to Blob conversion failed.'));
                }
                resolve(blob);
            }, 'image/jpeg', 0.8);
        };
        
        const onError = (e: Event) => {
            cleanup();
            const error = (e.target as HTMLVideoElement)?.error;
            const errorMessage = error ? `Code ${error.code}: ${error.message}` : 'An unknown video error occurred.';
            reject(new Error(`Video loading failed: ${errorMessage}`));
        };

        video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        video.addEventListener('seeked', onSeeked, { once: true });
        video.addEventListener('error', onError, { once: true });
        video.play().catch(onError); // Some browsers require play() to properly load frames
    });
};


export const MediaUploader = React.forwardRef<unknown, MediaUploaderProps>(
  ({ onUploadSuccess, memoryId, children, accept }, forwardRef) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadFile = async (file: File) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'エラー', description: 'ログインしていません。' });
            return;
        }

        const assetId = uuidv4();
        const toastInstance = toast({
            title: 'アップロード開始',
            description: `${file.name}のアップロード処理を開始します...`,
        });

        try {
            const isVideo = file.type.startsWith('video');
            let thumbDownloadURL: string | null = null;
            
            // --- Step 1 (Conditional): Generate and upload thumbnail for videos ---
            if (isVideo) {
                try {
                    toastInstance.update({ id: toastInstance.id, description: `動画のサムネイルを生成中...` });
                    const thumbnailBlob = await generateVideoThumbnail(file);
                    const thumbFileStoragePath = `users/${user.uid}/library/thumbnails/${assetId}_thumb.jpg`;
                    const thumbFileRef = ref(storage, thumbFileStoragePath);
                    const thumbUploadTask = await uploadBytes(thumbFileRef, thumbnailBlob, { contentType: 'image/jpeg' });
                    thumbDownloadURL = await getDownloadURL(thumbUploadTask.ref);
                    toastInstance.update({ id: toastInstance.id, description: `サムネイル生成完了。メインファイルをアップロード中...` });
                } catch (thumbError: any) {
                    console.error("Thumbnail generation or upload failed:", thumbError);
                    toastInstance.update({ id: toastInstance.id, variant: 'destructive', title: 'サムネイル生成失敗', description: thumbError.message });
                    // Continue without a thumbnail
                }
            } else {
                 toastInstance.update({ id: toastInstance.id, description: `ファイルをアップロード中...` });
            }

            // --- Step 2: Upload main file ---
            const mainFileStoragePath = memoryId
                ? `users/${user.uid}/memories/${memoryId}/assets/${assetId}_${file.name}`
                : `users/${user.uid}/library/assets/${assetId}_${file.name}`;
            const mainFileRef = ref(storage, mainFileStoragePath);
            const mainUploadTask = await uploadBytes(mainFileRef, file, { contentType: file.type });
            const mainDownloadURL = await getDownloadURL(mainUploadTask.ref);
            toastInstance.update({ id: toastInstance.id, description: `ファイルのアップロード完了。データベースに保存中...` });


            // --- Step 3: Create final document in Firestore ---
            const finalAssetData: Omit<Asset, 'id'> = {
                ownerUid: user.uid,
                memoryId: memoryId || null,
                name: file.name,
                type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'audio',
                storagePath: mainFileStoragePath,
                url: mainDownloadURL,
                thumbnailUrl: thumbDownloadURL ?? undefined, // This will be null for non-videos, or if thumb generation failed
                size: file.size,
                createdAt: serverTimestamp() as Timestamp,
                updatedAt: serverTimestamp() as Timestamp,
            };

            await setDoc(doc(db, 'assets', assetId), finalAssetData);
            
            const finalAsset: Asset = { 
                id: assetId, 
                ...finalAssetData,
                createdAt: new Date() as any, // Use client-side date for immediate UI updates
                updatedAt: new Date() as any,
            };
            
            toastInstance.update({ id: toastInstance.id, variant: "default", title: '成功', description: 'アップロードが完了しました。' });
            onUploadSuccess(finalAsset);

        } catch (error: any) {
            console.error("Upload process failed:", error);
            toastInstance.update({ id: toastInstance.id, variant: 'destructive', title: 'アップロード失敗', description: error.message });
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      await uploadFile(file);
      
      if (fileInputRef.current) {
          fileInputRef.current.value = "";
      }
    };
    
    const trigger = children ? (
        React.cloneElement(children as React.ReactElement, {
            onClick: (e: React.MouseEvent) => {
              e.preventDefault();
              fileInputRef.current?.click();
            },
        })
    ) : null;

    return (
      <>
        {trigger}
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={accept}
            style={{ display: 'none' }}
        />
      </>
    );
  }
);

MediaUploader.displayName = 'MediaUploader';
