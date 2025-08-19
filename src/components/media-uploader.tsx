// src/components/media-uploader.tsx
'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { storage, db } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Asset } from '@/lib/types';

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
          
          const assetData: Omit<Asset, 'id' | 'createdAt'> = {
            ownerUid: user.uid,
            name: file.name,
            type: type,
            storagePath: storagePath,
            url: downloadURL,
            size: file.size,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          const docRef = await addDoc(collection(db, 'assets'), assetData);
          
          const newAsset = { id: docRef.id, ...assetData } as Asset;
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
    // For album/text types, we don't trigger file input, we'll handle them differently
    if (type === 'album' || type === 'video_album' || type === 'text') {
        alert('この機能は準備中です。');
        return;
    }
    fileInputRef.current?.click();
  };

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
        {children}
      </div>
    </>
  );
}
