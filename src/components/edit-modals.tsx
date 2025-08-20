// src/components/edit-modals.tsx
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import type { Memory, Asset, PublicPageBlock } from '@/lib/types';
import { db } from '@/lib/firebase/client';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, Image as ImageIcon, Video, Mic, Type, Link, Square, Album, Upload, Clapperboard, Music } from 'lucide-react';
import Image from 'next/image';
import { MediaUploader } from './media-uploader';

// Design Modal (Cover & Profile Image)
export function DesignModal({ isOpen, setIsOpen, memory, assets }: { isOpen: boolean, setIsOpen: (open: boolean) => void, memory: Memory, assets: Asset[] }) {
    const [coverAssetId, setCoverAssetId] = useState(memory.coverAssetId);
    const [profileAssetId, setProfileAssetId] = useState(memory.profileAssetId);
    const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setCoverAssetId(memory.coverAssetId);
            setProfileAssetId(memory.profileAssetId);
        }
    }, [memory, isOpen]);

    useEffect(() => {
        setCoverImageUrl(assets.find(a => a.id === coverAssetId)?.url || null);
    }, [coverAssetId, assets]);
    
    useEffect(() => {
        setProfileImageUrl(assets.find(a => a.id === profileAssetId)?.url || null);
    }, [profileAssetId, assets]);

    const imageAssets = assets.filter(a => a.type === 'image');
    
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const memoryRef = doc(db, 'memories', memory.id);
            await updateDoc(memoryRef, {
                coverAssetId: coverAssetId || null,
                profileAssetId: profileAssetId || null,
                updatedAt: serverTimestamp()
            });
            toast({ title: '成功', description: 'カバーとプロフィール画像を更新しました。' });
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to save design:", error);
            toast({ variant: 'destructive', title: 'エラー', description: '画像の更新に失敗しました。' });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>デザインを編集</DialogTitle>
                    <DialogDescription>カバー画像とプロフィール画像を変更します。</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div>
                        <Label>カバー画像</Label>
                        <div className="flex gap-2">
                             <Select onValueChange={setCoverAssetId} value={coverAssetId ?? undefined}>
                                <SelectTrigger><SelectValue placeholder="カバー画像を選択..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="null">なし</SelectItem>
                                    {imageAssets.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <MediaUploader
                                assetType="image"
                                accept="image/*"
                                memoryId={memory.id}
                                onUploadSuccess={(asset) => {
                                    setCoverAssetId(asset.id);
                                    toast({ title: "アップロード完了", description: "カバー画像に設定しました。"})
                                }}
                            >
                                <Button type="button" variant="outline" size="icon"><Upload className="h-4 w-4"/></Button>
                            </MediaUploader>
                        </div>
                        <div className="mt-2 rounded-md overflow-hidden aspect-video relative bg-muted flex items-center justify-center">
                            {coverImageUrl ? <Image src={coverImageUrl} alt="Cover preview" fill className="object-cover" /> : <ImageIcon className="text-muted-foreground" />}
                        </div>
                    </div>
                     <div>
                        <Label>プロフィール画像</Label>
                        <div className="flex gap-2">
                            <Select onValueChange={setProfileAssetId} value={profileAssetId ?? undefined}>
                                <SelectTrigger><SelectValue placeholder="プロフィール画像を選択..." /></SelectTrigger>
                                <SelectContent>
                                <SelectItem value="null">なし</SelectItem>
                                    {imageAssets.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <MediaUploader
                                assetType="image"
                                accept="image/*"
                                memoryId={memory.id}
                                onUploadSuccess={(asset) => {
                                    setProfileAssetId(asset.id);
                                    toast({ title: "アップロード完了", description: "プロフィール画像に設定しました。"})
                                }}
                            >
                                <Button type="button" variant="outline" size="icon"><Upload className="h-4 w-4"/></Button>
                            </MediaUploader>
                        </div>
                         <div className="mt-2 rounded-full overflow-hidden relative w-24 h-24 bg-muted flex items-center justify-center">
                            {profileImageUrl ? <Image src={profileImageUrl} alt="Profile preview" fill className="object-cover" /> : <ImageIcon className="text-muted-foreground" />}
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


// About Modal (Title & Description)
export function AboutModal({ isOpen, setIsOpen, memory }: { isOpen: boolean, setIsOpen: (open: boolean) => void, memory: Memory }) {
    const [title, setTitle] = useState(memory.title);
    const [description, setDescription] = useState(memory.description);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
       if (isOpen) {
            setTitle(memory.title);
            setDescription(memory.description || '');
       }
    }, [memory, isOpen]);

    const handleSave = async () => {
        if (!title.trim()) {
            toast({ variant: 'destructive', title: 'エラー', description: 'タイトルは必須です。' });
            return;
        }
        setIsSaving(true);
        try {
            const memoryRef = doc(db, 'memories', memory.id);
            await updateDoc(memoryRef, {
                title,
                description,
                updatedAt: serverTimestamp()
            });
            toast({ title: '成功', description: '概要を更新しました。' });
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
                    <DialogTitle>概要を編集</DialogTitle>
                    <DialogDescription>ページに表示されるタイトルと紹介文を編集します。</DialogDescription>
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
export function BlockModal({ isOpen, setIsOpen, memory, assets, block, blockCount }: { isOpen: boolean, setIsOpen: (open: boolean) => void, memory: Memory, assets: Asset[], block: PublicPageBlock | null, blockCount: number }) {
    const [blockType, setBlockType] = useState<PublicPageBlock['type'] | null>(null);
    const [title, setTitle] = useState('');
    const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>(undefined);
    const [textContent, setTextContent] = useState(''); // For text block
    const [photoCaption, setPhotoCaption] = useState(''); // For photo block
    
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const isEditing = block !== null;
    const [selectedAssetUrl, setSelectedAssetUrl] = useState<string | null | undefined>(null);

    useEffect(() => {
        if (!selectedAssetId) {
            setSelectedAssetUrl(null);
            return;
        }
        const asset = assets.find(a => a.id === selectedAssetId);
        setSelectedAssetUrl(asset?.url);
    }, [selectedAssetId, assets]);

    useEffect(() => {
        if (isOpen) {
            if (isEditing && block) {
                setBlockType(block.type);
                setTitle(block.title || '');
                if (block.type === 'text') setTextContent(block.text?.content || '');
                if (block.type === 'photo') {
                    setSelectedAssetId(block.photo?.assetId);
                    setPhotoCaption(block.photo?.caption || '');
                }
                if (block.type === 'video') setSelectedAssetId(block.video?.assetId);
                if (block.type === 'audio') setSelectedAssetId(block.audio?.assetId);
                if (block.type === 'album') setSelectedAssetId(undefined); // Reset for album
            } else {
                // Reset for new block
                setBlockType(null);
                setTitle('');
                setTextContent('');
                setPhotoCaption('');
                setSelectedAssetId(undefined);
            }
        }
    }, [block, isOpen, isEditing]);
    
    const imageAssets = assets.filter(a => a.type === 'image');
    const videoAssets = assets.filter(a => a.type === 'video');
    const audioAssets = assets.filter(a => a.type === 'audio');

    const handleSave = async () => {
        if (!blockType) {
            toast({ variant: 'destructive', title: 'エラー', description: 'ブロックタイプを選択してください。' });
            return;
        }

        setIsSaving(true);
        try {
            const getAssetUrl = (id?: string) => assets.find(a => a.id === id)?.url || null;

            if (isEditing && block) {
                const blockRef = doc(db, 'memories', memory.id, 'blocks', block.id);
                const updateData: any = { title, updatedAt: serverTimestamp(), type: blockType };
                if (blockType === 'text') updateData.text = { content: textContent };
                if (blockType === 'photo') updateData.photo = { assetId: selectedAssetId, caption: photoCaption, src: getAssetUrl(selectedAssetId) };
                if (blockType === 'video') updateData.video = { assetId: selectedAssetId, src: getAssetUrl(selectedAssetId) };
                if (blockType === 'audio') updateData.audio = { assetId: selectedAssetId, src: getAssetUrl(selectedAssetId) };
                await updateDoc(blockRef, updateData);
                toast({ title: '成功', description: 'ブロックを更新しました。' });
            } else {
                const newBlockData: any = {
                    type: blockType,
                    title,
                    order: blockCount,
                    visibility: 'show',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                if (blockType === 'text') newBlockData.text = { content: textContent };
                if (blockType === 'photo') newBlockData.photo = { assetId: selectedAssetId, caption: photoCaption, src: getAssetUrl(selectedAssetId) };
                if (blockType === 'video') newBlockData.video = { assetId: selectedAssetId, src: getAssetUrl(selectedAssetId) };
                if (blockType === 'audio') newBlockData.audio = { assetId: selectedAssetId, src: getAssetUrl(selectedAssetId) };
                
                await addDoc(collection(db, 'memories', memory.id, 'blocks'), newBlockData);
                toast({ title: '成功', description: '新しいブロックを追加しました。' });
            }
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to save block:", error);
            toast({ variant: 'destructive', title: 'エラー', description: 'ブロックの保存に失敗しました。' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleUploadSuccess = (asset: Asset) => {
        setSelectedAssetId(asset.id);
        toast({ title: "アップロード完了", description: `"${asset.name}"のアップロードが完了しました。`});
    }

    const renderAssetSelector = (
        type: 'image' | 'video' | 'audio',
        availableAssets: Asset[],
        placeholder: string
    ) => (
        <div className="space-y-2">
            <Label>メディア選択</Label>
            <div className="flex gap-2">
                <Select onValueChange={setSelectedAssetId} value={selectedAssetId}>
                    <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
                    <SelectContent>
                        {availableAssets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <MediaUploader
                    assetType={type}
                    accept={`${type}/*`}
                    memoryId={memory.id}
                    onUploadSuccess={handleUploadSuccess}
                >
                    <Button type="button" variant="outline" size="icon"><Upload className="h-4 w-4"/></Button>
                </MediaUploader>
            </div>
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
        
        const selectedAsset = assets.find(a => a.id === selectedAssetId);

        let specificFields = null;
        if (blockType === 'photo') {
            specificFields = (
                 <div className="space-y-4">
                    {renderAssetSelector('image', imageAssets, '写真を選択...')}
                    {selectedAssetUrl && (
                         <div className="mt-2 rounded-md overflow-hidden aspect-video relative bg-muted flex items-center justify-center">
                            <Image src={selectedAssetUrl} alt="Preview" fill className="object-cover" />
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
                    {selectedAsset && (
                         <div className="mt-2 rounded-md overflow-hidden aspect-video relative bg-muted flex items-center justify-center text-muted-foreground">
                            <Clapperboard className="w-12 h-12" />
                            <p className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-1 py-0.5 rounded">{selectedAsset.name}</p>
                        </div>
                    )}
                 </div>
            )
        } else if (blockType === 'audio') {
             specificFields = (
                 <div className="space-y-4">
                    {renderAssetSelector('audio', audioAssets, '音声を選択...')}
                    {selectedAsset && (
                        <div className="mt-2 rounded-md p-4 bg-muted flex items-center gap-3 text-muted-foreground">
                            <Music className="w-6 h-6" />
                            <p className="text-sm font-medium">{selectedAsset.name}</p>
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

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'ブロックを編集' : '新しいブロックを追加'}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    {renderContent()}
                </div>
                {blockType && (
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setBlockType(null)} disabled={isEditing}>戻る</Button>
                        <DialogClose asChild><Button variant="outline">キャンセル</Button></DialogClose>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            保存
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
