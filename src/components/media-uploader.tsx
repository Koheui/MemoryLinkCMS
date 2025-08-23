// src/components/media-uploader.tsx
'use client';
import * as React from 'react';
import { useRef, useState, useImperativeHandle } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { storage, db, serverTimestamp } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import type { Asset } from '@/lib/types';

export interface MediaUploaderRef {
  triggerUpload: () => void;
  uploadFile: (file: File) => Promise<Asset | null>;
}

interface MediaUploaderProps {
  assetType: 'image' | 'video' | 'audio';
  accept: string;
  onUploadSuccess?: (asset: Asset) => void;
  onFileSelected?: (file: File) => void;
  memoryId?: string;
}

export const MediaUploader = React.forwardRef<MediaUploaderRef, MediaUploaderProps>(
  ({ assetType, accept, onUploadSuccess, onFileSelected, memoryId }, ref) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadFile = async (file: File): Promise<Asset | null> => {
        if (!user) {
            toast({ variant: 'destructive', title: 'エラー', description: 'ログインしていません。' });
            return null;
        }

        const storagePath = memoryId
            ? `users/${user.uid}/memories/${memoryId}/assets/${Date.now()}_${file.name}`
            : `users/${user.uid}/library/${Date.now()}_${file.name}`;
            
        const assetCollectionRef = collection(db, 'assets');

        try {
            const assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'url'> = {
                ownerUid: user.uid,
                memoryId: memoryId || null,
                name: file.name,
                type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'audio',
                size: file.size,
                storagePath: storagePath,
            };

            const docRef = await addDoc(assetCollectionRef, {
                ...assetData,
                url: '',
                thumbnailUrl: '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const storageRef = ref(storage, storagePath);
            const metadata = { 
                contentType: file.type,
                customMetadata: { assetId: docRef.id }
            };

            return new Promise((resolve, reject) => {
                const uploadTask = uploadBytesResumable(storageRef, file, metadata);

                uploadTask.on('state_changed',
                    null,
                    (error) => {
                        console.error("Upload failed:", error);
                        toast({ variant: 'destructive', title: 'アップロード失敗', description: error.message });
                        reject(error);
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        const finalAssetDoc = doc(db, 'assets', docRef.id);
                        await updateDoc(finalAssetDoc, {
                            url: downloadURL,
                            updatedAt: serverTimestamp(),
                        });
                        
                        const finalAssetSnapshot = await getDoc(finalAssetDoc);
                        const finalDocData = finalAssetSnapshot.data();

                        const finalAsset: Asset = { 
                            id: finalAssetSnapshot.id,
                            ...finalDocData,
                            createdAt: (finalDocData?.createdAt as Timestamp)?.toDate(),
                            updatedAt: (finalDocData?.updatedAt as Timestamp)?.toDate(),
                        } as Asset;

                        resolve(finalAsset);
                    }
                );
            });
        } catch (error) {
            console.error("Upload process failed:", error);
            toast({ variant: 'destructive', title: 'エラー', description: 'アップロード処理中にエラーが発生しました。' });
            return null;
        }
    };
    
    useImperativeHandle(ref, () => ({
      triggerUpload: () => {
        fileInputRef.current?.click();
      },
      uploadFile
    }));

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (onFileSelected) {
        onFileSelected(file);
      } else if (onUploadSuccess) {
        // Fallback to old behavior if onFileSelected is not provided
        uploadFile(file).then(asset => {
          if (asset) {
            onUploadSuccess(asset);
          }
        });
      }
      
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        style={{ display: 'none' }}
      />
    );
  }
);

MediaUploader.displayName = 'MediaUploader';