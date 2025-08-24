// src/components/media-uploader.tsx
'use client';
import React, { useRef, useState, useImperativeHandle } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { storage, db } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc, getDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import type { Asset } from '@/lib/types';

export interface MediaUploaderRef {
  triggerUpload: () => void;
  uploadFile: (file: File, assetId: string) => Promise<Asset | null>;
  createPlaceholderAsset: (file: File) => Promise<Asset | null>;
}

interface MediaUploaderProps {
  assetType: 'image' | 'video' | 'audio';
  accept: string;
  onUploadSuccess?: (asset: Asset) => void;
  onFileSelected?: (file: File) => void;
  memoryId?: string;
  children?: React.ReactNode;
}

export const MediaUploader = React.forwardRef<MediaUploaderRef, MediaUploaderProps>(
  ({ assetType, accept, onUploadSuccess, onFileSelected, memoryId, children }, forwardRef) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const createPlaceholderAsset = async (file: File): Promise<Asset | null> => {
        if (!user) {
            toast({ variant: 'destructive', title: 'エラー', description: 'ログインしていません。' });
            return null;
        }

        try {
            const assetCollectionRef = collection(db, 'assets');
            const assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'| 'url' | 'storagePath'> = {
                ownerUid: user.uid,
                memoryId: memoryId || null,
                name: file.name,
                type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'audio',
                size: file.size,
            };

            const docRef = await addDoc(assetCollectionRef, {
                ...assetData,
                url: '', // Initially empty
                storagePath: '', // Initially empty
                thumbnailUrl: null,
                thumbnailCandidates: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const placeholderSnapshot = await getDoc(docRef);
            const placeholderDocData = placeholderSnapshot.data();
            
            const placeholderAsset: Asset = {
                id: placeholderSnapshot.id,
                 ...placeholderDocData,
                createdAt: (placeholderDocData?.createdAt as Timestamp)?.toDate(),
                updatedAt: (placeholderDocData?.updatedAt as Timestamp)?.toDate(),
            } as Asset;

            return placeholderAsset;

        } catch (error: any) {
            console.error("Placeholder asset creation failed:", error);
            toast({ variant: 'destructive', title: 'エラー', description: `プレースホルダーの作成に失敗しました: ${error.message}` });
            return null;
        }
    }

    const uploadFile = async (file: File, assetId: string): Promise<Asset | null> => {
        if (!user) {
            toast({ variant: 'destructive', title: 'エラー', description: 'ログインしていません。' });
            return null;
        }

        const storagePath = memoryId
            ? `users/${user.uid}/memories/${memoryId}/assets/${assetId}_${file.name}`
            : `users/${user.uid}/library/${assetId}_${file.name}`;
            
        const assetDocRef = doc(db, 'assets', assetId);

        try {
            await updateDoc(assetDocRef, { storagePath });

            const storageRef = ref(storage, storagePath);
            const metadata = { 
                contentType: file.type,
                customMetadata: { assetId: assetId }
            };

            return new Promise((resolve, reject) => {
                const uploadTask = uploadBytesResumable(storageRef, file, metadata);

                uploadTask.on('state_changed',
                    null,
                    (error) => {
                        console.error("Upload failed:", error);
                        toast({ variant: 'destructive', title: 'アップロード失敗', description: error.message });
                        // TODO: Maybe delete the placeholder doc here.
                        reject(error);
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        await updateDoc(assetDocRef, {
                            url: downloadURL,
                            updatedAt: serverTimestamp(),
                        });
                        
                        const finalAssetSnapshot = await getDoc(assetDocRef);
                        const finalDocData = finalAssetSnapshot.data();

                        const finalAsset: Asset = { 
                            id: finalAssetSnapshot.id,
                            ...finalDocData,
                            createdAt: (finalDocData?.createdAt as Timestamp)?.toDate(),
                            updatedAt: (finalDocData?.updatedAt as Timestamp)?.toDate(),
                        } as Asset;
                        
                        if (onUploadSuccess) {
                           onUploadSuccess(finalAsset);
                        }

                        resolve(finalAsset);
                    }
                );
            });
        } catch (error: any) {
            console.error("Upload process failed:", error);
            toast({ variant: 'destructive', title: 'エラー', description: `アップロード処理中にエラーが発生しました: ${error.message}` });
            return null;
        }
    };
    
    useImperativeHandle(forwardRef, () => ({
      triggerUpload: () => {
        fileInputRef.current?.click();
      },
      uploadFile,
      createPlaceholderAsset,
    }));

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (onFileSelected) {
        onFileSelected(file);
      } else {
        // This direct upload is now discouraged in favor of the placeholder flow
        createPlaceholderAsset(file).then(placeholder => {
            if(placeholder) uploadFile(file, placeholder.id);
        })
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
