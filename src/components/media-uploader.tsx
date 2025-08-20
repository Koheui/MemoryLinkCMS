
// src/components/media-uploader.tsx
'use client';
import * as React from 'react';
import { useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { storage, db } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';
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
  
  // A helper function to get memoryId regardless of the current page
  const getMemoryIdForUser = async (uid: string): Promise<string | null> => {
      let memoryId = params.memoryId as string;
      if (memoryId) return memoryId;

      // If not on a memory page, query for it.
      const memoriesQuery = query(
          collection(db, 'memories'),
          where('ownerUid', '==', uid),
          limit(1)
      );
      const querySnapshot = await getDocs(memoriesQuery);
      if (!querySnapshot.empty) {
          return querySnapshot.docs[0].id;
      }
      return null;
  }


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'エラー', description: 'ログインしていません。' });
      return;
    }
    
    const memoryId = await getMemoryIdForUser(user.uid);

    if (!memoryId) {
      toast({ variant: 'destructive', title: 'エラー', description: '有効なページではありません。' });
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    // Path for Firebase Storage remains user-specific to align with security rules
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
          
          // Writes to the top-level 'assets' collection, secured by rules.
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
  const uploaderContent = React.cloneElement(child, {
    disabled: isUploading,
    onClick: (e: React.MouseEvent<HTMLElement>) => {
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
