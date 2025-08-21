// src/components/media-uploader.tsx
'use client';
import * as React from 'react';
import { useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { storage, db, serverTimestamp } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import type { Asset } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface MediaUploaderProps {
  assetType: 'image' | 'video' | 'audio';
  accept: string;
  children: ReactNode;
  onUploadSuccess?: (asset: Asset) => void;
  memoryId?: string; // Make optional for library-wide uploads
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

    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    // Path now depends on whether memoryId is provided
    const storagePath = memoryId 
      ? `users/${user.uid}/memories/${memoryId}/${assetType}/${Date.now()}_${file.name}`
      : `users/${user.uid}/library/${assetType}/${Date.now()}_${file.name}`;
    
    try {
      // 1. Create a document in the root 'assets' collection
      const assetCollectionRef = collection(db, 'assets');
      const assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'url'> = {
        ownerUid: user.uid,
        memoryId: memoryId || null,
        name: file.name,
        type: assetType,
        size: file.size,
        storagePath: storagePath,
      };

      const docRef = await addDoc(assetCollectionRef, {
        ...assetData,
        url: '', // URL is not available yet
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
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
          
          const finalAssetDoc = doc(db, 'assets', docRef.id);
          await updateDoc(finalAssetDoc, {
            url: downloadURL,
            updatedAt: serverTimestamp(),
          });
          
          const finalAssetSnapshot = await getDoc(finalAssetDoc);
          const finalAsset = { id: finalAssetSnapshot.id, ...finalAssetSnapshot.data() } as Asset;

          onUploadSuccess?.(finalAsset);

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
    fileInputRef.current?.click();
  };
  
  const child = React.Children.only(children) as React.ReactElement;
  
  const uploaderTrigger = React.cloneElement(child, {
    disabled: isUploading,
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
        disabled={isUploading}
      />
      {uploaderTrigger}
    </>
  );
}
