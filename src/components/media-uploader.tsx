// src/components/media-uploader.tsx
'use client';
import * as React from 'react';
import { useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { storage, db } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, collectionGroup } from 'firebase/firestore';
import type { Asset } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

interface MediaUploaderProps {
  type: 'image' | 'video' | 'audio' | 'text' | 'album' | 'video_album';
  accept: string;
  children: ReactNode;
  onUploadSuccess?: (asset: Asset) => void;
  memoryId?: string; // Make memoryId optional
}

export function MediaUploader({ type, accept, children, onUploadSuccess, memoryId: memoryIdProp }: MediaUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const params = useParams();
  
  // Use memoryId from props if available, otherwise fallback to params (for memory editor page)
  const memoryId = memoryIdProp || params.memoryId as string;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'エラー', description: 'ログインしていません。' });
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    if(fileInputRef.current) fileInputRef.current.value = "";
    
    // Determine storage path. If memoryId exists, use it.
    const pathPrefix = memoryId ? `users/${user.uid}/memories/${memoryId}` : `users/${user.uid}/library`;
    const storagePath = `${pathPrefix}/${type}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);

    try {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          // Progress can be handled here if needed
        },
        (error) => {
          console.error("Upload failed:", error);
          toast({ variant: 'destructive', title: 'アップロード失敗', description: error.message });
          setIsUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          const assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> = {
            ownerUid: user.uid,
            name: file.name,
            type: type,
            storagePath: storagePath,
            url: downloadURL,
            size: file.size,
          };
          
          if (memoryId) {
            assetData.memoryId = memoryId;
          }
          
          // All assets are stored in a subcollection of a memory now.
          // For media library, we could create a "library" memory or store them at the top level.
          // Let's assume for now they go into a subcollection of the memory
          const collectionPath = memoryId 
            ? `memories/${memoryId}/assets` 
            : `users/${user.uid}/assets`; // Fallback for library, might need review

          const docRef = await addDoc(collection(db, `memories/${memoryId}/assets`), {
             ...assetData,
             createdAt: serverTimestamp(),
             updatedAt: serverTimestamp(),
          });
          
          const newAsset = { id: docRef.id, ...assetData, createdAt: new Date(), updatedAt: new Date() } as Asset;
          onUploadSuccess?.(newAsset);
          
          toast({ title: '成功', description: `${file.name} をアップロードしました。` });
          setIsUploading(false);
        }
      );
    } catch (error) {
      console.error("Upload failed:", error);
      toast({ variant: 'destructive', title: 'エラー', description: 'アップロード処理中にエラーが発生しました。' });
      setIsUploading(false);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    
    if (type === 'album' || type === 'video_album' || type === 'text') {
        toast({ title: '準備中', description: 'この機能は現在準備中です。' });
        return;
    }
    fileInputRef.current?.click();
  };
  
  const uploaderContent = React.cloneElement(children as React.ReactElement, {
    disabled: isUploading,
    children: isUploading ? (
        <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            アップロード中...
        </>
    ) : (children as React.ReactElement).props.children
  });

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        style={{ display: 'none' }}
        disabled={isUploading}
      />
      <div onClick={handleClick} className="inline-block">
        {uploaderContent}
      </div>
    </>
  );
}
