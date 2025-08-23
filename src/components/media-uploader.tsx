// src/components/media-uploader.tsx
'use client';
import * as React from 'react';
import { useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { storage, db, serverTimestamp } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import type { Asset, PublicPageBlock } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface MediaUploaderProps {
  assetType: 'image' | 'video' | 'audio';
  accept: string;
  children: ReactNode;
  onUploadSuccess?: (asset: Asset) => void;
  onSaveBlock?: (newBlockData: Omit<PublicPageBlock, 'id'|'order'|'createdAt'|'updatedAt'>) => void; // 自動保存用
  memoryId?: string; // If provided, asset is associated with a memory
}

export function MediaUploader({ assetType, accept, children, onUploadSuccess, onSaveBlock, memoryId }: MediaUploaderProps) {
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
    
    const storagePath = memoryId
      ? `users/${user.uid}/memories/${memoryId}/assets/${Date.now()}_${file.name}`
      : `users/${user.uid}/library/${Date.now()}_${file.name}`;
      
    const assetCollectionRef = collection(db, 'assets');
    
    try {
      // 1. Create a document in the root 'assets' collection to get an ID
      const assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'url'> = {
        ownerUid: user.uid,
        memoryId: memoryId || null,
        name: file.name,
        type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'audio',
        size: file.size,
        storagePath: storagePath,
      };

      const docRef = await addDoc(assetCollectionRef, {
        ...assetData,
        url: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // 2. Start the upload to Firebase Storage with the assetId in metadata
      const storageRef = ref(storage, storagePath);
      const metadata = { 
        contentType: file.type,
        customMetadata: {
            assetId: docRef.id // Embed the asset ID here
        }
      };
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      uploadTask.on('state_changed',
        (snapshot) => {
          // Progress reporting can be implemented here
        },
        (error) => {
          console.error("Upload failed:", error);
          toast({ variant: 'destructive', title: 'アップロード失敗', description: error.message });
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
          const finalDocData = finalAssetSnapshot.data();

          const finalAsset: Asset = { 
            id: finalAssetSnapshot.id,
            ...finalDocData,
            createdAt: (finalDocData?.createdAt as Timestamp)?.toDate(),
            updatedAt: (finalDocData?.updatedAt as Timestamp)?.toDate(),
          } as Asset;

          onUploadSuccess?.(finalAsset);

          toast({ title: '成功', description: `${file.name} のアップロードが完了しました。` });
          
          // 4. Automatically create and save a new block if onSaveBlock is provided
          if (onSaveBlock) {
             const newBlockData: any = { type: assetType, title: file.name, visibility: 'show' };
             if (assetType === 'photo') newBlockData.photo = { assetId: finalAsset.id, caption: '', src: finalAsset.url };
             if (assetType === 'video') newBlockData.video = { assetId: finalAsset.id, src: finalAsset.url, poster: finalAsset.thumbnailUrl };
             if (assetType === 'audio') newBlockData.audio = { assetId: finalAsset.id, src: finalAsset.url };
             onSaveBlock(newBlockData);
          }

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
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          処理中
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
      {uploaderTrigger}
    </>
  );
}
