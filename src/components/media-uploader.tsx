
// src/components/media-uploader.tsx
'use client';
import React, { useRef, useState, useImperativeHandle } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { storage, db } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, setDoc, Timestamp, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import type { Asset } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export interface MediaUploaderRef {
  triggerUpload: () => void;
}

interface MediaUploaderProps {
  assetType: 'image' | 'video' | 'audio';
  accept: string;
  onUploadSuccess: (asset: Asset) => void;
  memoryId?: string;
  onFileSelected?: (file: File) => void; 
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
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (!blob) {
                    return reject(new Error('Canvas to Blob conversion failed'));
                }
                URL.revokeObjectURL(video.src); // Clean up
                resolve(blob);
            }, 'image/jpeg', 0.8);
        };
        
        video.onerror = (e) => {
            reject(new Error('Video loading failed.'));
            URL.revokeObjectURL(video.src);
        };
    });
};


export const MediaUploader = React.forwardRef<MediaUploaderRef, MediaUploaderProps>(
  ({ assetType, accept, onUploadSuccess, memoryId, onFileSelected, children }, forwardRef) => {
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

        const assetDocRef = doc(db, 'assets', assetId);
        
        try {
            const isVideo = file.type.startsWith('video');
            let thumbnailBlob: Blob | null = null;
            
            if (isVideo) {
                try {
                    thumbnailBlob = await generateVideoThumbnail(file);
                } catch(thumbError: any) {
                    console.error("Thumbnail generation failed:", thumbError);
                    toast({ variant: 'destructive', title: 'サムネイル生成失敗', description: thumbError.message });
                    // Continue without thumbnail
                }
            }
            
            // Step 1: Upload main file
            const mainFileStoragePath = memoryId
                ? `users/${user.uid}/memories/${memoryId}/assets/${assetId}_${file.name}`
                : `users/${user.uid}/library/${assetId}_${file.name}`;
            const mainFileRef = ref(storage, mainFileStoragePath);
            const mainUploadTask = uploadBytesResumable(mainFileRef, file, { contentType: file.type });

            // Step 2: Upload thumbnail if it exists
            let thumbUploadTask: Promise<string | null> = Promise.resolve(null);
            if (thumbnailBlob) {
                const thumbFileStoragePath = mainFileStoragePath.replace(/(\.[\w\d_-]+)$/i, '_thumb.jpg');
                const thumbFileRef = ref(storage, thumbFileStoragePath);
                thumbUploadTask = uploadBytesResumable(thumbFileRef, thumbnailBlob, { contentType: 'image/jpeg' })
                    .then(snapshot => getDownloadURL(snapshot.ref));
            }

            // Step 3: Wait for both uploads and get URLs
            const [mainDownloadURL, thumbDownloadURL] = await Promise.all([
                 mainUploadTask.then(snapshot => getDownloadURL(snapshot.ref)),
                 thumbUploadTask
            ]);

            // Step 4: Create final document in Firestore
            const finalAssetData: Omit<Asset, 'id'> = {
                ownerUid: user.uid,
                memoryId: memoryId || null,
                name: file.name,
                type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'audio',
                storagePath: mainFileStoragePath,
                url: mainDownloadURL,
                thumbnailUrl: thumbDownloadURL || null,
                size: file.size,
                createdAt: serverTimestamp() as Timestamp,
                updatedAt: serverTimestamp() as Timestamp,
            };

            await setDoc(assetDocRef, finalAssetData);
            
            const finalAsset = { id: assetId, ...finalAssetData } as Asset;
            
            toast.update(toastId, { title: '成功', description: 'アップロードが完了しました。' });
            
            if (onUploadSuccess) {
                onUploadSuccess(finalAsset);
            }

        } catch (error: any) {
            console.error("Upload process failed:", error);
            toast.update(toastId, { variant: 'destructive', title: 'アップロード失敗', description: error.message });
            await deleteDoc(assetDocRef).catch(e => console.error("Cleanup failed", e));
        }
    };
    
    useImperativeHandle(forwardRef, () => ({
      triggerUpload: () => {
        fileInputRef.current?.click();
      },
    }));

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      if (onFileSelected) {
          onFileSelected(file);
      } else {
        await uploadFile(file);
      }
      
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
