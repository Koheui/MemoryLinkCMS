
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

interface MediaUploaderProps {
  assetType: 'image' | 'video' | 'audio';
  accept: string;
  children: ReactNode;
  onUploadSuccess?: (asset: Asset) => void;
  memoryId: string;
}

export function MediaUploader({ assetType, accept, children, onUploadSuccess, memoryId }: MediaUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'エラー', description: 'ログインしていません。' });
      return;
    }
    
    if (!memoryId) {
        toast({ variant: 'destructive', title: 'エラー', description: '有効なページが選択されていません。' });
        return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    const storagePath = `users/${user.uid}/memories/${memoryId}/${assetType}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);

    try {
      const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type });

      uploadTask.on('state_changed',
        (snapshot) => {},
        (error) => {
          console.error("Upload failed:", error);
          toast({ variant: 'destructive', title: 'アップロード失敗', description: error.message });
          setIsUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          const assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> = {
            ownerUid: user.uid,
            memoryId: memoryId,
            name: file.name,
            type: assetType,
            storagePath: storagePath,
            url: downloadURL,
            size: file.size,
          };
          
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

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!memoryId) {
      toast({
        variant: 'destructive',
        title: 'アップロード不可',
        description: 'まず想い出ページを選択または作成してください。',
      });
      return;
    }
    fileInputRef.current?.click();
  };
  
  const child = React.Children.only(children) as React.ReactElement;
  
  const uploaderTrigger = React.cloneElement(child, {
    disabled: isUploading || !memoryId,
    onClick: handleClick,
    children: isUploading ? (
        <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ...
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
        disabled={isUploading || !memoryId}
      />
      {uploaderTrigger}
    </>
  );
}
