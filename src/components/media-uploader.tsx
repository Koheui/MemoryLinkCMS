
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
  type: 'image' | 'video' | 'audio' | 'text' | 'album' | 'video_album';
  accept: string;
  children: ReactNode;
  onUploadSuccess?: (asset: Asset) => void;
  memoryId?: string;
}

export function MediaUploader({ type, accept, children, onUploadSuccess, memoryId: memoryIdProp }: MediaUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const params = useParams();
  
  const memoryIdFromParams = Array.isArray(params.memoryId) ? params.memoryId[0] : params.memoryId;
  const memoryId = memoryIdProp || memoryIdFromParams;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'エラー', description: 'ログインしていません。' });
      return;
    }

    if (!memoryId) {
        toast({ variant: 'destructive', title: 'アップロード先がありません', description: 'ファイルをアップロードするには、まずページを選択または作成してください。' });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    if (fileInputRef.current) fileInputRef.current.value = "";
    
    // Corrected type usage to align with asset type
    const assetType = type.startsWith('video') ? 'video' : type.startsWith('audio') ? 'audio' : 'image';
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
            name: file.name,
            type: assetType, // Use the determined asset type
            storagePath: storagePath,
            url: downloadURL,
            size: file.size,
            memoryId: memoryId,
          };
          
          const docRef = await addDoc(collection(db, 'memories', memoryId, 'assets'), {
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
    if (type === 'album' || type === 'video_album' || type === 'text') {
        toast({ title: '準備中', description: 'この機能は現在準備中です。' });
        return;
    }

    if (!memoryId) {
      toast({ variant: 'destructive', title: 'アップロード先がありません', description: 'ファイルをアップロードするには、まずページを選択または作成してください。' });
      return;
    }

    fileInputRef.current?.click();
  };
  
  // Clone the child element and add our own onClick logic, while preserving the original.
  const child = React.Children.only(children) as React.ReactElement;
  const uploaderContent = React.cloneElement(child, {
    disabled: isUploading,
    onClick: (e: React.MouseEvent<HTMLElement>) => {
        // Prevent default behavior if it's a trigger that would otherwise do something else
        if (child.props.onClick) {
            e.preventDefault(); 
        }
        
        // Call our uploader logic
        handleClick();

        // If the original child had an onClick, call it too.
        if (child.props.onClick) {
            child.props.onClick(e);
        }
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
