// src/components/media-uploader.tsx
'use client';
import * as React from 'react';
import { useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { storage, db } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Asset } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

interface MediaUploaderProps {
  assetType: 'image' | 'video' | 'audio';
  accept: string;
  children: ReactNode;
  onUploadSuccess?: (asset: Asset) => void;
}

export function MediaUploader({ assetType, accept, children, onUploadSuccess }: MediaUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const params = useParams();
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'エラー', description: 'ログインしていません。' });
      return;
    }
    
    const memoryId = params.memoryId as string;
    if (!memoryId) {
        // This case should ideally not happen if the uploader is only on the memory page
        toast({ variant: 'destructive', title: 'エラー', description: '有効なページではありません。' });
        return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Reset file input to allow uploading the same file again
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    const storagePath = `users/${user.uid}/memories/${memoryId}/${assetType}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);

    try {
      const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type });

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
            memoryId: memoryId, // Associate asset with the memory page
            name: file.name,
            type: assetType,
            storagePath: storagePath,
            url: downloadURL,
            size: file.size,
          };
          
          // The collection is now 'assets' at the root, secured by rules.
          const docRef = await addDoc(collection(db, 'assets'), {
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

  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  const child = React.Children.only(children) as React.ReactElement;
  // Clone the child element to inject props
  const uploaderContent = React.cloneElement(child, {
    disabled: isUploading,
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      // If the original child has an onClick, prevent our logic from stopping it
      if (child.props.onClick) {
        e.stopPropagation(); 
      }
      handleClick();
    },
    children: isUploading ? (
        <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            アップロード中...
        </>
    ) : child.props.children
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
      {uploaderContent}
    </>
  );
}
