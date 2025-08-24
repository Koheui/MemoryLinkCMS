// src/components/media-uploader.tsx
'use client';
import React, { useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { storage, db } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL, uploadBytes } from 'firebase/storage';
import { doc, setDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import type { Asset } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface MediaUploaderProps {
  assetType: 'image' | 'video' | 'audio';
  accept: string;
  onUploadSuccess: (asset: Asset) => void;
  memoryId?: string;
  children?: React.ReactNode;
}

const generateVideoThumbnail = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);

        video.onloadeddata = () => {
            // Seek to a specific time, e.g., the first second
            video.currentTime = 1;
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                URL.revokeObjectURL(video.src);
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(video.src); // Clean up
                if (!blob) {
                    return reject(new Error('Canvas to Blob conversion failed'));
                }
                resolve(blob);
            }, 'image/jpeg', 0.8);
        };
        
        video.onerror = (e) => {
            URL.revokeObjectURL(video.src);
            reject(new Error('Video loading failed.'));
        };
    });
};


export const MediaUploader = React.forwardRef<unknown, MediaUploaderProps>(
  ({ accept, onUploadSuccess, memoryId, children }, forwardRef) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadFile = async (file: File) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'エラー', description: 'ログインしていません。' });
            return;
        }

        const assetId = uuidv4();
        const toastId = `upload-${assetId}`;
        toast({ id: toastId, title: 'アップロード開始', description: `${file.name}をアップロードしています...` });

        try {
            const isVideo = file.type.startsWith('video');
            
            // Step 1: Upload main file
            const mainFileStoragePath = memoryId
                ? `users/${user.uid}/memories/${memoryId}/assets/${assetId}_${file.name}`
                : `users/${user.uid}/library/${assetId}_${file.name}`;
            const mainFileRef = ref(storage, mainFileStoragePath);
            const mainUploadTask = await uploadBytes(mainFileRef, file, { contentType: file.type });
            const mainDownloadURL = await getDownloadURL(mainUploadTask.ref);

            // Step 2: Handle thumbnail for video
            let thumbDownloadURL: string | null = null;
            if (isVideo) {
                 try {
                    const thumbnailBlob = await generateVideoThumbnail(file);
                    const thumbFileStoragePath = mainFileStoragePath.replace(/(\.[\w\d_-]+)$/i, '_thumb.jpg');
                    const thumbFileRef = ref(storage, thumbFileStoragePath);
                    const thumbUploadTask = await uploadBytes(thumbFileRef, thumbnailBlob, { contentType: 'image/jpeg' });
                    thumbDownloadURL = await getDownloadURL(thumbUploadTask.ref);
                } catch(thumbError: any) {
                    console.error("Thumbnail generation failed, continuing without it:", thumbError);
                    toast({ variant: 'destructive', title: 'サムネイル生成失敗', description: thumbError.message });
                }
            }

            // Step 3: Create final document in Firestore
            const finalAssetData: Omit<Asset, 'id'> = {
                ownerUid: user.uid,
                memoryId: memoryId || null,
                name: file.name,
                type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'audio',
                storagePath: mainFileStoragePath,
                url: mainDownloadURL,
                thumbnailUrl: thumbDownloadURL,
                size: file.size,
                createdAt: serverTimestamp() as Timestamp,
                updatedAt: serverTimestamp() as Timestamp,
            };

            await setDoc(doc(db, 'assets', assetId), finalAssetData);
            
            // Construct the final asset object including the generated ID for the callback
            const finalAsset: Asset = { 
                id: assetId, 
                ...finalAssetData,
                // These will be server timestamps, but we'll use a client-side date for immediate UI updates
                createdAt: new Date() as any,
                updatedAt: new Date() as any
            };
            
            toast.update(toastId, { title: '成功', description: 'アップロードが完了しました。' });
            
            if (onUploadSuccess) {
                onUploadSuccess(finalAsset);
            }

        } catch (error: any) {
            console.error("Upload process failed:", error);
            toast.update(toastId, { variant: 'destructive', title: 'アップロード失敗', description: error.message });
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      await uploadFile(file);
      
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    
    const trigger = children ? (
        React.cloneElement(children as React.ReactElement, {
            onClick: (e: React.MouseEvent) => {
              e.preventDefault();
              fileInputRef.current?.click()
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
