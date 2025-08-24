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
  onFileSelected?: (file: File) => void; // Callback when file is selected
  children?: React.ReactNode;
}

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

        // Step 1: Create a placeholder document in Firestore
        // This makes the asset "exist" immediately for the UI.
        const assetDocRef = doc(db, 'assets', assetId);
        const placeholderAsset: Omit<Asset, 'id'> = {
            ownerUid: user.uid,
            memoryId: memoryId || null,
            name: file.name,
            type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'audio',
            storagePath: '', // Will be updated later
            url: '',         // Will be updated later
            thumbnailUrl: null,
            size: file.size,
            createdAt: serverTimestamp() as Timestamp,
            updatedAt: serverTimestamp() as Timestamp,
        };
        await setDoc(assetDocRef, placeholderAsset);

        try {
            const storagePath = memoryId
                ? `users/${user.uid}/memories/${memoryId}/assets/${assetId}_${file.name}`
                : `users/${user.uid}/library/${assetId}_${file.name}`;
            const storageRef = ref(storage, storagePath);

            // Metadata is crucial for triggering the Functions correctly
            const metadata = {
              contentType: file.type,
              customMetadata: {
                assetId: assetId,
                ownerUid: user.uid,
              }
            };
            
            // For videos, Functions will generate the thumbnail. For images, we just upload.
            const uploadTask = uploadBytesResumable(storageRef, file, metadata);

            uploadTask.on('state_changed', 
                (snapshot) => { /* Progress can be handled here if needed */ },
                async (error) => { // Handle unsuccessful uploads
                    console.error("Upload failed:", error);
                    toast.update(toastId, { variant: 'destructive', title: 'アップロード失敗', description: error.message });
                    // Clean up the placeholder document on failure
                    await deleteDoc(assetDocRef);
                },
                async () => { // Handle successful uploads
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                    // Update the document with the final URL and storage path.
                    // For videos, the `thumbnailUrl` will be updated later by the Function.
                    await setDoc(assetDocRef, { 
                        url: downloadURL,
                        storagePath: storagePath,
                        updatedAt: serverTimestamp(),
                    }, { merge: true });
                    
                    const finalDoc = await getDoc(assetDocRef);
                    const finalAsset = { id: finalDoc.id, ...finalDoc.data() } as Asset;

                    toast.update(toastId, { title: '成功', description: 'アップロードが完了しました。' });
                    
                    if (onUploadSuccess) {
                        onUploadSuccess(finalAsset);
                    }
                }
            );

        } catch (error: any) {
            console.error("Upload process failed:", error);
            toast.update(toastId, { variant: 'destructive', title: 'アップロード失敗', description: error.message });
            // Clean up on failure
            await deleteDoc(assetDocRef);
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
      
      // If a callback is provided, let the parent component know a file was selected
      if (onFileSelected) {
          onFileSelected(file);
      }
      
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
