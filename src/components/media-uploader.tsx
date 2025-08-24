// src/components/media-uploader.tsx
'use client';
import React, { useRef, useState, useImperativeHandle } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { storage, db } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL, uploadBytes } from 'firebase/storage';
import { collection, doc, updateDoc, getDoc, Timestamp, serverTimestamp, setDoc } from 'firebase/firestore';
import type { Asset } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export interface MediaUploaderRef {
  triggerUpload: () => void;
}

interface MediaUploaderProps {
  assetType: 'image' | 'video' | 'audio';
  accept: string;
  onUploadSuccess?: (asset: Asset) => void;
  memoryId?: string;
  children?: React.ReactNode;
}

export const MediaUploader = React.forwardRef<MediaUploaderRef, MediaUploaderProps>(
  ({ assetType, accept, onUploadSuccess, memoryId, children }, forwardRef) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const generateVideoThumbnail = async (videoFile: File): Promise<File | null> => {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;
            video.playsInline = true;

            video.onloadedmetadata = () => {
                video.currentTime = Math.min(1, video.duration / 2); // Seek to 1s or midpoint
            };

            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(null);

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(video.src); // Clean up video object URL

                canvas.toBlob((blob) => {
                    if (!blob) return resolve(null);
                    const thumbFile = new File([blob], `thumb_${videoFile.name.split('.')[0]}.jpg`, { type: 'image/jpeg' });
                    resolve(thumbFile);
                }, 'image/jpeg', 0.8);
            };

            video.onerror = (e) => {
                console.error("Video thumbnail generation error:", e);
                URL.revokeObjectURL(video.src);
                resolve(null);
            };

            video.src = URL.createObjectURL(videoFile);
            video.play().catch(() => {}); // Play is needed on some browsers to trigger seek
        });
    }

    const uploadFile = async (file: File) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'エラー', description: 'ログインしていません。' });
            return;
        }

        const assetId = uuidv4();
        const toastId = `upload-${assetId}`;
        toast({ id: toastId, title: 'アップロード開始', description: `${file.name}をアップロードしています...` });

        try {
            // Step 1: Generate thumbnail if it's a video
            let thumbnailFile: File | null = null;
            if (file.type.startsWith('video/')) {
                thumbnailFile = await generateVideoThumbnail(file);
                 if (!thumbnailFile) {
                    toast({ variant: 'destructive', title: 'エラー', description: '動画からサムネイルを生成できませんでした。' });
                }
            }
            
            // Step 2: Upload main file
            const mainFileStoragePath = memoryId
                ? `users/${user.uid}/memories/${memoryId}/assets/${assetId}_${file.name}`
                : `users/${user.uid}/library/${assetId}_${file.name}`;
            const mainFileRef = ref(storage, mainFileStoragePath);
            await uploadBytes(mainFileRef, file);
            const mainFileUrl = await getDownloadURL(mainFileRef);

            // Step 3: Upload thumbnail file if it exists
            let thumbnailUrl: string | null = null;
            if (thumbnailFile) {
                const thumbStoragePath = mainFileStoragePath.replace(file.name, thumbnailFile.name);
                const thumbFileRef = ref(storage, thumbStoragePath);
                await uploadBytes(thumbFileRef, thumbnailFile);
                thumbnailUrl = await getDownloadURL(thumbFileRef);
            }
            
            // Step 4: Create document in Firestore with all data
            const assetDocRef = doc(db, 'assets', assetId);
            const newAssetData: Omit<Asset, 'id'> = {
                ownerUid: user.uid,
                memoryId: memoryId || null,
                name: file.name,
                type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'audio',
                storagePath: mainFileStoragePath,
                url: mainFileUrl,
                thumbnailUrl,
                size: file.size,
                createdAt: serverTimestamp() as Timestamp,
                updatedAt: serverTimestamp() as Timestamp,
            };

            await setDoc(assetDocRef, newAssetData);
            
            const finalSnapshot = await getDoc(assetDocRef);
            const finalData = finalSnapshot.data();

            const finalAsset: Asset = {
                id: assetId,
                ...finalData,
                createdAt: (finalData?.createdAt as Timestamp)?.toDate(),
                updatedAt: (finalData?.updatedAt as Timestamp)?.toDate(),
            } as Asset;

            toast.update(toastId, { title: '成功', description: 'アップロードが完了しました。' });
            
            if (onUploadSuccess) {
                onUploadSuccess(finalAsset);
            }

        } catch (error: any) {
            console.error("Upload failed:", error);
            toast.update(toastId, { variant: 'destructive', title: 'アップロード失敗', description: error.message });
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

      await uploadFile(file);
      
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
