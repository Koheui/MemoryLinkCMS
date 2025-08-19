// src/components/media-uploader.tsx
'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { storage, db } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Asset } from '@/lib/types';
import { Button } from '@/components/ui/button'; // Import Button
import { Loader2 } from 'lucide-react'; // Import Loader

interface MediaUploaderProps {
  type: 'image' | 'video' | 'audio' | 'text' | 'album' | 'video_album';
  accept: string;
  children: ReactNode;
  onUploadSuccess?: (asset: Asset) => void;
}

export function MediaUploader({ type, accept, children, onUploadSuccess }: MediaUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'エラー', description: 'ログインしていません。' });
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // Reset file input value to allow re-uploading the same file
    if(fileInputRef.current) fileInputRef.current.value = "";

    const storagePath = `users/${user.uid}/assets/${type}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);

    try {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          // Optional: handle progress updates
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        },
        (error) => {
          // Handle unsuccessful uploads
          console.error("Upload failed:", error);
          toast({ variant: 'destructive', title: 'アップロード失敗', description: error.message });
          setIsUploading(false);
        },
        async () => {
          // Handle successful uploads on complete
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          const assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> = {
            ownerUid: user.uid,
            name: file.name,
            type: type,
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

  const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation(); // Stop propagation to prevent Accordion from toggling
    
    // For album/text types, we don't trigger file input, we'll handle them differently
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
