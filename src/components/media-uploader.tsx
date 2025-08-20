
// src/components/media-uploader.tsx
'use client';
import * as React from 'react';
import { useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { storage, db } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL, updateMetadata } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import type { Asset } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface MediaUploaderProps {
  assetType: 'image' | 'video' | 'audio';
  accept: string;
  children: ReactNode;
  onUploadStarted?: (assetId: string) => void;
  memoryId: string;
}

export function MediaUploader({ assetType, accept, children, onUploadStarted, memoryId }: MediaUploaderProps) {
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
    
    try {
      // 1. Create a document in Firestore first to get an ID
      const assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'url'> = {
        ownerUid: user.uid,
        memoryId: memoryId,
        name: file.name,
        type: assetType,
        size: file.size,
        storagePath: storagePath,
      };

      const docRef = await addDoc(collection(db, 'assets'), {
        ...assetData,
        url: '', // URL is not available yet
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Notify parent component that an asset has been created and upload is starting
      onUploadStarted?.(docRef.id);

      // 2. Start the upload to Firebase Storage
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type });

      uploadTask.on('state_changed',
        (snapshot) => {
          // Can be used to show progress
        },
        (error) => {
          console.error("Upload failed:", error);
          toast({ variant: 'destructive', title: 'アップロード失敗', description: error.message });
          // Optionally, delete the Firestore document if upload fails
          setIsUploading(false);
        },
        async () => {
          // 3. Once upload is complete, get the URL and update the Firestore document
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          await updateDoc(doc(db, 'assets', docRef.id), {
            url: downloadURL,
            updatedAt: serverTimestamp(),
          });
          
          toast({ title: '成功', description: `${file.name} のアップロードが完了しました。` });
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
        <Loader2 className="h-4 w-4 animate-spin" />
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

    