// src/components/edit-modals.tsx
'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import type { Memory, Asset, PublicPageBlock } from '@/lib/types';
import { db } from '@/lib/firebase/client';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Image as ImageIcon, Video, Mic, Type, Album, Upload, Clapperboard, Music, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { MediaUploader, type MediaUploaderRef } from './media-uploader';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

// CoverPhoto Modal
export function CoverPhotoModal({ isOpen, setIsOpen, memory, assets, onUploadSuccess, onSave }: { isOpen: boolean, setIsOpen: (open: boolean) => void, memory: Memory, assets: Asset[], onUploadSuccess: (asset: Asset) => void, onSave: (data: { coverAssetId: string | null }) => void }) {
    const [coverAssetId, setCoverAssetId] = useState(memory.coverAssetId);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const uploaderRef = useRef<MediaUploaderRef>(null);

    useEffect(() => {
        if (isOpen) {
            setCoverAssetId(memory.coverAssetId);
        }
    }, [memory, isOpen]);

    const coverImageUrl = useMemo(() => {
        return assets.find(a => a.id === coverAssetId)?.url || null;
    }, [coverAssetId, assets]);

    const imageAssets = useMemo(() => assets.filter(a => a.type === 'image'), [assets]);
    
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const memoryRef = doc(db, 'memories', memory.id);
            const saveData = {
                coverAssetId: coverAssetId || null,
            };
            await updateDoc(memoryRef, {
                ...saveData,
                updatedAt: serverTimestamp()
            });
            toast({ title: '成功', description: 'カバー画像を更新しました。' });
            onSave(saveData);
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to save cover photo:", error);
            toast({ variant: 'destructive', title: 'エラー', description: '画像の更新に失敗しました。' });
        } finally {
            setIsSaving(false);
        }
    }
    
    const handleCoverUploadSuccess = (asset: Asset) => {
        onUploadSuccess(asset); 
        setCoverAssetId(asset.id);
        toast({ title: "アップロード完了", description: "カバー画像に設定しました。"});
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>カバー画像を編集</DialogTitle>
                    <DialogDescription>ページのヘッダーに表示される画像を編集します。</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div>
                        <Label>カバー画像</Label>
                        <div className="flex gap-2">
                             <Select onValueChange={(value) => setCoverAssetId(value !== 'no-selection' ? value : null)} value={coverAssetId ?? 'no-selection'}>
                                <SelectTrigger><SelectValue placeholder="カバー画像を選択..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="no-selection">なし</SelectItem>
                                    {imageAssets.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <MediaUploader
                                ref={uploaderRef}
                                assetType="image"
                                accept="image/*"
                                memoryId={memory.id}
                                onUploadSuccess={handleCoverUploadSuccess}
                            >
                                <Button type="button" variant="outline" size="icon">
                                    <Upload className="h-4 w-4"/>
                                </Button>
                            </MediaUploader>
                        </div>
                        <div className="mt-2 rounded-md overflow-hidden aspect-video relative bg-muted flex items-center justify-center">
                            {coverImageUrl ? <Image src={coverImageUrl} alt="Cover preview" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" /> : <ImageIcon className="text-muted-foreground" />}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">キャンセル</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        保存
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// About Modal (Title, Description, Profile Image)
export function AboutModal({ isOpen, setIsOpen, memory, assets, onUploadSuccess, onSave }: { isOpen: boolean, setIsOpen: (open: boolean) => void, memory: Memory, assets: Asset[], onUploadSuccess: (asset: Asset) => void, onSave: (data: { title: string, description: string, profileAssetId: string | null }) => void }) {
    const [title, setTitle] = useState(memory.title);
    const [description, setDescription] = useState(memory.description);
    const [profileAssetId, setProfileAssetId] = useState(memory.profileAssetId);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const uploaderRef = useRef<MediaUploaderRef>(null);

    useEffect(() => {
       if (isOpen) {
            setTitle(memory.title);
            setDescription(memory.description || '');
            setProfileAssetId(memory.profileAssetId);
       }
    }, [memory, isOpen]);

    const profileImageUrl = useMemo(() => {
        return assets.find(a => a.id === profileAssetId)?.url || null;
    }, [profileAssetId, assets]);

    const imageAssets = useMemo(() => assets.filter(a => a.type === 'image'), [assets]);

    const handleProfileUploadSuccess = (asset: Asset) => {
        onUploadSuccess(asset); 
        setProfileAssetId(asset.id);
        toast({ title: "アップロード完了", description: "プロフィール画像に設定しました。"});
    }

    const handleSave = async () => {
        if (!title.trim()) {
            toast({ variant: 'destructive', title: 'エラー', description: 'タイトルは必須です。' });
            return;
        }
        setIsSaving(true);
        try {
            const memoryRef = doc(db, 'memories', memory.id);
            const saveData = {
                title,
                description,
                profileAssetId: profileAssetId || null,
            };
            await updateDoc(memoryRef, {
                ...saveData,
                updatedAt: serverTimestamp()
            });
            toast({ title: '成功', description: '概要を更新しました。' });
            onSave(saveData);
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to save about info:", error);
            toast({ variant: 'destructive', title: 'エラー', description: '概要の更新に失敗しました。' });
        } finally {
            setIsSaving(false);
        }
    }

     return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>アバウト情報を編集</DialogTitle>
                    <DialogDescription>タイトル、紹介文、プロフィール画像を編集します。</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="title">タイトル</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="description">紹介文</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[120px]" />
                    </div>
                    <div>
                        <Label>プロフィール画像</Label>
                        <div className="flex gap-2">
                            <Select onValueChange={(value) => setProfileAssetId(value !== 'no-selection' ? value : null)} value={profileAssetId ?? 'no-selection'}>
                                <SelectTrigger><SelectValue placeholder="プロフィール画像を選択..." /></SelectTrigger>
                                <SelectContent>
                                <SelectItem value="no-selection">なし</SelectItem>
                                    {imageAssets.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <MediaUploader
                                ref={uploaderRef}
                                assetType="image"
                                accept="image/*"
                                memoryId={memory.id}
                                onUploadSuccess={handleProfileUploadSuccess}
                            >
                                <Button type="button" variant="outline" size="icon">
                                    <Upload className="h-4 w-4"/>
                                </Button>
                            </MediaUploader>
                        </div>
                         <div className="mt-2 rounded-full overflow-hidden relative w-24 h-24 bg-muted flex items-center justify-center">
                            {profileImageUrl ? <Image src={profileImageUrl} alt="Profile preview" fill className="object-cover" sizes="96px" /> : <ImageIcon className="text-muted-foreground" />}
                         </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">キャンセル</Button></DialogClose>
                     <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        保存
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Block Modal (Create or Edit Block)
export function BlockModal({ isOpen, setIsOpen, memory, assets, block, onSave, onUploadSuccess }: { isOpen: boolean, setIsOpen: (open: boolean) => void, memory: Memory, assets: Asset[], block: PublicPageBlock | null, onSave: (data: Omit<PublicPageBlock, 'id'|'order'|'createdAt'|'updatedAt'>, block?: PublicPageBlock | null) => void, onUploadSuccess: (asset: Asset) => void }) {
    const [blockType, setBlockType] = useState<PublicPageBlock['type'] | null>(null);
    const [title, setTitle] = useState('');
    const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>(undefined);
    
    const [pendingUpload, setPendingUpload] = useState<{file: File, tempId: string, thumbnail?: File} | null>(null);

    const [textContent, setTextContent] = useState('');
    const [photoCaption, setPhotoCaption] = useState('');
    const [selectedThumbnail, setSelectedThumbnail] = useState<string | undefined>(undefined);
    
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const isEditing = block !== null;
    const uploaderRef = useRef<MediaUploaderRef>(null);
    
    const imageAssets = useMemo(() => assets.filter(a => a.type === 'image'), [assets]);
    const videoAssets = useMemo(() => assets.filter(a => a.type === 'video'), [assets]);
    const audioAssets = useMemo(() => assets.filter(a => a.type === 'audio'), [assets]);
    const selectedAsset = useMemo(() => assets.find(a => a.id === selectedAssetId), [selectedAssetId, assets]);

    const resetState = (retainBlockType = false) => {
        if (!retainBlockType) setBlockType(null);
        setTitle('');
        setTextContent('');
        setPhotoCaption('');
        setSelectedAssetId(undefined);
        setSelectedThumbnail(undefined);
        setPendingUpload(null);
        setIsSaving(false);
    }
    
    useEffect(() => {
        // Only reset state if the modal is being opened for a new block,
        // or if the block being edited changes.
        if (isOpen && (block?.id !== (isEditing ? block.id : undefined))) {
            if (isEditing && block) {
                setBlockType(block.type);
                setTitle(block.title || '');
                if (block.type === 'text') setTextContent(block.text?.content || '');
                if (block.type === 'photo') {
                    setSelectedAssetId(block.photo?.assetId);
                    setPhotoCaption(block.photo?.caption || '');
                }
                if (block.type === 'video') {
                    const videoAssetId = block.video?.assetId;
                    setSelectedAssetId(videoAssetId);
                    if (videoAssetId) {
                        const asset = assets.find(a => a.id === videoAssetId);
                        setSelectedThumbnail(asset?.thumbnailUrl);
                    }
                }
                if (block.type === 'audio') setSelectedAssetId(block.audio?.assetId);
            } else {
                resetState();
            }
        }
    }, [block, isOpen, isEditing, assets]);


    useEffect(() => {
        if (selectedAsset?.type === 'video') {
            setSelectedThumbnail(selectedAsset.thumbnailUrl);
        }
    }, [selectedAsset]);

    const generateVideoThumbnail = async (videoFile: File): Promise<File | null> => {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(videoFile);
            video.currentTime = 1; // Seek to 1 second
            
            video.onloadeddata = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(null);

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (!blob) return resolve(null);
                    const thumbFile = new File([blob], `thumb_${videoFile.name}.jpg`, { type: 'image/jpeg' });
                    URL.revokeObjectURL(video.src); // Clean up
                    resolve(thumbFile);
                }, 'image/jpeg');
            };
            video.onerror = () => {
                URL.revokeObjectURL(video.src);
                resolve(null);
            };
        });
    }

    const handleFileSelectedForUpload = async (file: File) => {
        if (!uploaderRef.current) {
            toast({variant: 'destructive', title: "エラー", description: "アップローダーの準備ができていません。"});
            return;
        }

        try {
            const placeholderAsset = await uploaderRef.current.createPlaceholderAsset(file);
            if(placeholderAsset) {
                onUploadSuccess(placeholderAsset);
                setSelectedAssetId(placeholderAsset.id);
                
                let thumbnailFile: File | undefined = undefined;
                if (file.type.startsWith('video/')) {
                    const generatedThumb = await generateVideoThumbnail(file);
                    if (generatedThumb) {
                        thumbnailFile = generatedThumb;
                    } else {
                         toast({variant: 'destructive', title: "エラー", description: "動画からサムネイルを生成できませんでした。"});
                    }
                }
                setPendingUpload({file, tempId: placeholderAsset.id, thumbnail: thumbnailFile});
            }
        } catch (error: any) {
             console.error("Placeholder creation failed:", error);
             toast({variant: 'destructive', title: "エラー", description: `アップロードの準備に失敗しました: ${error.message}`});
        }
    };
    
    const handleSave = async () => {
        if (!blockType) {
            toast({ variant: 'destructive', title: 'エラー', description: 'ブロックタイプを選択してください。' });
            return;
        }

        if (['photo', 'video', 'audio'].includes(blockType) && !selectedAssetId) {
             toast({ variant: 'destructive', title: 'エラー', description: 'メディアファイルを選択またはアップロードしてください。' });
            return;
        }

        setIsSaving(true);

        try {
            if (pendingUpload && uploaderRef.current) {
                await uploaderRef.current.uploadFile(pendingUpload.file, pendingUpload.tempId, pendingUpload.thumbnail);
            }
            
            const newBlockData: any = { type: blockType, title, visibility: 'show' };
            if (blockType === 'text') newBlockData.text = { content: textContent };
            if (blockType === 'photo') newBlockData.photo = { assetId: selectedAssetId, caption: photoCaption };
            if (blockType === 'video') newBlockData.video = { assetId: selectedAssetId };
            if (blockType === 'audio') newBlockData.audio = { assetId: selectedAssetId };
            
            await onSave(newBlockData, block);
            
            setIsOpen(false);
        } catch (error: any) {
            console.error("Failed to save block:", error);
            toast({ variant: 'destructive', title: 'エラー', description: error.message || 'ブロックの保存に失敗しました。' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const renderAssetSelector = (
        type: 'image' | 'video' | 'audio',
        availableAssets: Asset[],
        placeholder: string
    ) => (
        <div className="space-y-2">
            <Label>メディア選択</Label>
            <div className="flex gap-2">
                <Select onValueChange={(value) => { setSelectedAssetId(value || undefined); setPendingUpload(null); }} value={selectedAssetId}>
                    <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
                    <SelectContent>
                        {availableAssets.map(a => <SelectItem key={a.id} value={a.id} disabled={!a.url}>{a.name}{!a.url && " (処理中...)"}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <MediaUploader
                    ref={uploaderRef}
                    assetType={type}
                    accept={`${type}/*`}
                    memoryId={memory.id}
                    onFileSelected={handleFileSelectedForUpload}
                    onUploadSuccess={onUploadSuccess}
                >
                    <Button type="button" variant="outline" size="icon">
                        <Upload className="h-4 w-4"/>
                    </Button>
                </MediaUploader>
            </div>
             {pendingUpload && pendingUpload.tempId === selectedAssetId && (
                <div className="mt-2 text-sm text-muted-foreground p-2 bg-muted rounded-md flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>アップロード準備完了: {pendingUpload.file.name}</span>
                </div>
            )}
        </div>
    );

    const renderContent = () => {
        if (!blockType) {
            return (
                <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setBlockType('text')}><Type className="w-8 h-8"/>テキスト/リンク</Button>
                    <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setBlockType('photo')}><ImageIcon className="w-8 h-8"/>写真</Button>
                    <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setBlockType('album')} disabled><Album className="w-8 h-8"/>アルバム (近日)</Button>
                    <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setBlockType('video')}><Video className="w-8 h-8"/>動画</Button>
                    <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setBlockType('audio')}><Mic className="w-8 h-8"/>音声</Button>
                </div>
            );
        }
        
        let specificFields = null;
        if (blockType === 'photo') {
            specificFields = (
                 <div className="space-y-4">
                    {renderAssetSelector('image', imageAssets, '写真を選択...')}
                    {(selectedAsset?.url) && (
                         <div className="mt-2 rounded-md overflow-hidden aspect-video relative bg-muted flex items-center justify-center">
                            <Image src={selectedAsset.url} alt="Preview" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                        </div>
                    )}
                     <div>
                        <Label htmlFor="caption">キャプション (任意)</Label>
                        <Input id="caption" value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)} />
                    </div>
                </div>
            )
        } else if (blockType === 'video') {
             specificFields = (
                 <div className="space-y-4">
                    {renderAssetSelector('video', videoAssets, '動画を選択...')}
                    {(selectedAsset) && (
                         <div className="space-y-2">
                             <Label>サムネイルプレビュー</Label>
                             <div className="w-full aspect-video bg-muted rounded-md flex items-center justify-center">
                                 {selectedAsset.thumbnailUrl ? (
                                    <Image src={selectedAsset.thumbnailUrl} alt="サムネイル" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover rounded-md" />
                                 ) : pendingUpload?.thumbnail ? (
                                    <Image src={URL.createObjectURL(pendingUpload.thumbnail)} alt="生成されたサムネイル" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover rounded-md" />
                                 ) : (
                                     <div className="text-muted-foreground flex flex-col items-center gap-2">
                                       <Clapperboard className="w-8 h-8"/>
                                       <span>プレビューなし</span>
                                     </div>
                                 )}
                             </div>
                         </div>
                    )}
                 </div>
            )
        } else if (blockType === 'audio') {
             specificFields = (
                 <div className="space-y-4">
                    {renderAssetSelector('audio', audioAssets, '音声を選択...')}
                    {(selectedAsset) && (
                        <div className="mt-2 rounded-md p-4 bg-muted flex items-center gap-3 text-muted-foreground">
                            <Music className="w-6 h-6" />
                            <p className="text-sm font-medium">{selectedAsset.name}</p>
                            {!selectedAsset.url && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
                        </div>
                    )}
                 </div>
            )
        } else if (blockType === 'text') {
             specificFields = (
                 <div>
                    <Label htmlFor="block-content">内容 (リンク先のURLなど)</Label>
                    <Textarea id="block-content" value={textContent} onChange={(e) => setTextContent(e.target.value)} />
                </div>
            );
        }


        return (
            <div className="space-y-4">
                <div>
                    <Label htmlFor="block-title">タイトル</Label>
                    <Input id="block-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                {specificFields}
            </div>
        );
    };
    
    const getSaveButtonText = () => {
        if (isSaving) return "保存中...";
        return "保存";
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if(!open) resetState();
            setIsOpen(open);
        }}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'ブロックを編集' : '新しいブロックを追加'}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    {renderContent()}
                </div>
                {blockType && ( 
                    <DialogFooter>
                        {!isEditing && <Button variant="ghost" onClick={() => resetState(false)}>戻る</Button>}
                        <DialogClose asChild><Button variant="outline">キャンセル</Button></DialogClose>
                        <Button onClick={handleSave} disabled={isSaving || (!!pendingUpload && !selectedAsset?.thumbnailUrl)}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {getSaveButtonText()}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
