
// src/components/edit-modals.tsx
'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import type { Memory, Asset, PublicPageBlock, PublicPage } from '@/lib/types';
import { db } from '@/lib/firebase/client';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Image as ImageIcon, Video, Mic, Type, Album, Upload, Clapperboard, Music, CheckCircle, Globe, Phone, Mail, Link as LinkIcon, Milestone, Camera, X } from 'lucide-react';
import { FaXTwitter, FaInstagram, FaYoutube } from 'react-icons/fa6';
import Image from 'next/image';
import { MediaUploader } from './media-uploader';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';


// --- Preview Modal ---
// This modal reuses the rendering logic from the public page to show an accurate preview.

function convertMemoryToPublicPage(memory: Memory, assets: Asset[]): PublicPage {
    const getAssetUrlById = (assetId: string | null): string | undefined => {
        if (!assetId) return undefined;
        return assets.find((a: Asset) => a.id === assetId)?.url;
    }
    const getAssetById = (assetId: string | null): Asset | undefined => {
        if (!assetId) return undefined;
        return assets.find((a: Asset) => a.id === assetId);
    }

    const hydratedBlocks = (memory.blocks || []).map((block: PublicPageBlock) => {
        const newBlock = { ...block };
        if (newBlock.type === 'photo' && newBlock.photo?.assetId) {
            newBlock.photo.src = getAssetUrlById(newBlock.photo.assetId);
        }
        if (newBlock.type === 'video' && newBlock.video?.assetId) {
            const asset = getAssetById(newBlock.video.assetId);
            newBlock.video.src = asset?.url;
            newBlock.video.poster = asset?.thumbnailUrl;
        }
        if (newBlock.type === 'audio' && newBlock.audio?.assetId) {
            newBlock.audio.src = getAssetUrlById(newBlock.audio.assetId);
        }
        if (newBlock.type === 'album' && newBlock.album?.assetIds) {
            newBlock.album.items = newBlock.album.assetIds.map((id: string) => ({ 
                src: getAssetUrlById(id) || '',
                caption: assets.find(a => a.id === id)?.name || ''
            }));
        }
        return newBlock;
    });


    return {
        id: memory.id,
        memoryId: memory.id,
        title: memory.title,
        about: {
            text: memory.description || '',
            format: 'plain'
        },
        design: memory.design,
        media: {
            cover: { url: getAssetUrlById(memory.coverAssetId) || "https://placehold.co/1200x480.png", width: 1200, height: 480 },
            profile: { url: getAssetUrlById(memory.profileAssetId) || "https://placehold.co/400x400.png", width: 400, height: 400 },
        },
        ordering: 'custom',
        blocks: hydratedBlocks,
        publish: { status: 'published', publishedAt: memory.updatedAt },
        createdAt: memory.createdAt,
        updatedAt: memory.updatedAt,
    };
}


const blockIcons: { [key: string]: React.ReactNode } = {
  globe: <Globe className="h-6 w-6" />,
  youtube: <FaYoutube className="h-6 w-6" />, 
  tel: <Phone className="h-6 w-6" />,
  mail: <Mail className="h-6 w-6" />,
  x: <FaXTwitter className="h-5 w-5" />, 
  instagram: <FaInstagram className="h-6 w-6" />,
  default: <LinkIcon className="h-6 w-6" />,
};

const BlockRenderer = ({ block }: { block: PublicPageBlock }) => {
    switch (block.type) {
        case 'album':
            return (
                <Card className="overflow-hidden bg-white/5 border-white/10 shadow-lg">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                           <Milestone className="h-5 w-5 text-gray-300" />
                           <h3 className="font-semibold text-white">{block.title}</h3>
                        </div>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-4">
                        <Carousel opts={{ loop: true, align: "start" }} className="w-full">
                            <CarouselContent className="-ml-2">
                                {block.album?.items?.map((item, index) => (
                                    <CarouselItem key={index} className="pl-2 md:basis-1/2">
                                        <div className="aspect-video relative rounded-lg overflow-hidden">
                                           {item.src && <Image src={item.src} alt={block.title || `Album image ${index+1}`} fill className="object-cover" />}
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className="ml-14 hidden sm:flex" />
                            <CarouselNext className="mr-14 hidden sm:flex" />
                        </Carousel>
                    </CardContent>
                </Card>
            );
        case 'photo':
             return (
                 <Card className="overflow-hidden bg-white/5 border-white/10 shadow-lg">
                    {block.photo?.src && (
                         <div className="aspect-video relative w-full">
                             <Image src={block.photo.src} alt={block.title || "Single photo"} fill className="object-cover" />
                         </div>
                    )}
                    <CardContent className="p-4">
                        <h3 className="font-semibold text-white">{block.title}</h3>
                        {block.photo?.caption && <p className="text-sm text-gray-300 mt-1">{block.photo.caption}</p>}
                    </CardContent>
                </Card>
            );
        case 'video':
            return (
                 <Card className="overflow-hidden bg-white/5 border-white/10 shadow-lg group">
                    <div className="aspect-video relative w-full bg-black">
                        {block.video?.poster ? (
                             <Image src={block.video.poster} alt={block.title || "Video thumbnail"} fill className="object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                        ) : <div className="w-full h-full bg-black flex items-center justify-center"><Clapperboard className="h-16 w-16 text-white/70" /></div>}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Clapperboard className="h-16 w-16 text-white/70" />
                        </div>
                    </div>
                    <CardContent className="p-4">
                        <h3 className="font-semibold text-white">{block.title}</h3>
                    </CardContent>
                </Card>
            );
        case 'audio':
              return (
                 <Card className="flex items-center gap-4 p-4 bg-white/5 border-white/10 shadow-lg">
                    <div className="flex-shrink-0">
                        <Music className="h-8 w-8 text-gray-300" />
                    </div>
                    <div className="flex-grow">
                        <h3 className="font-semibold text-white">{block.title}</h3>
                    </div>
                    <div className="flex-shrink-0">
                       <Badge variant="outline" className="text-white/70 border-white/20">再生</Badge>
                    </div>
                </Card>
            );
        case 'text':
             return (
               <a href="#" className="group block w-full rounded-xl bg-white/5 p-2 shadow-lg ring-1 ring-white/10 backdrop-blur-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:bg-white/10 hover:shadow-2xl hover:ring-white/20">
                    <div className="flex items-center gap-4 rounded-lg bg-transparent p-3">
                        <div className="flex-shrink-0 text-white">
                           {blockIcons[block.icon || 'default'] || blockIcons.default}
                        </div>
                        <div className="flex-grow text-center text-lg font-semibold text-white">
                            {block.title}
                        </div>
                         <div className="flex-shrink-0 text-white/30 transition-transform group-hover:text-white/60 group-hover:translate-x-1">
                            <LinkIcon className="h-5 w-5" />
                        </div>
                    </div>
                </a>
            );
        default:
            return null;
    }
}

export function PreviewModal({ isOpen, setIsOpen, memory, assets }: { isOpen: boolean, setIsOpen: (open: boolean) => void, memory: Memory, assets: Asset[] }) {
    const manifest = useMemo(() => convertMemoryToPublicPage(memory, assets), [memory, assets]);
    const design = manifest.design || {};

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 gap-0 bg-background border-0 shadow-2xl">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>プレビュー</DialogTitle>
                </DialogHeader>
                 <div className="flex-1 overflow-auto bg-muted/40">
                     <div className="bg-background mx-auto max-w-2xl">
                             <header className="relative">
                                <div className="relative aspect-[21/9] w-full overflow-hidden">
                                    <Image 
                                    src={manifest.media.cover.url}
                                    alt={manifest.title}
                                    fill
                                    priority
                                    data-ai-hint="background scenery"
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                </div>
                                
                                <div className="relative flex flex-col items-center -mt-20 px-6">
                                    <div className="h-40 w-40 rounded-full z-10 bg-gray-800 border-4 border-background shadow-lg relative overflow-hidden shrink-0">
                                        <Image 
                                            src={manifest.media.profile.url}
                                            alt="Profile"
                                            fill
                                            data-ai-hint="portrait person"
                                            className="rounded-full object-cover"
                                            sizes="160px"
                                        />
                                    </div>
                                    
                                    <div className="mt-4 text-left w-full">
                                        <h1 className="text-xl font-bold text-foreground">{manifest.title}</h1>
                                        <p className="mt-2 text-base text-muted-foreground max-w-prose">{manifest.about.text}</p>
                                    </div>
                                </div>
                            </header>

                            <main className="space-y-6 pb-12 mt-8 px-4 sm:px-6">
                                {manifest.blocks
                                    .filter(block => block.visibility === 'show')
                                    .sort((a,b) => a.order - b.order)
                                    .map(block => (
                                <BlockRenderer key={block.id} block={block} />
                                ))}
                            </main>

                            <footer className="mt-8 text-center text-xs text-gray-500 pb-8 px-4">
                                <p>&copy; {new Date().getFullYear()}. Powered by MemoryLink</p>
                            </footer>
                    </div>
                </div>
                <DialogFooter className="p-4 border-t bg-background">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>閉じる</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}



// CoverPhoto Modal
export function CoverPhotoModal({ isOpen, setIsOpen, memory, assets, onUploadSuccess, onSave }: { isOpen: boolean, setIsOpen: (open: boolean) => void, memory: Memory, assets: Asset[], onUploadSuccess: (asset: Asset) => void, onSave: (data: { coverAssetId: string | null }) => void }) {
    const [coverAssetId, setCoverAssetId] = useState(memory.coverAssetId);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

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
    const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
    
    const [textContent, setTextContent] = useState('');
    const [photoCaption, setPhotoCaption] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const isEditing = block !== null;
    
    const imageAssets = useMemo(() => assets.filter(a => a.type === 'image'), [assets]);
    const videoAssets = useMemo(() => assets.filter(a => a.type === 'video'), [assets]);
    const audioAssets = useMemo(() => assets.filter(a => a.type === 'audio'), [assets]);

    const resetState = (retainBlockType = false) => {
        if (!retainBlockType) setBlockType(null);
        setTitle('');
        setTextContent('');
        setPhotoCaption('');
        setSelectedAsset(undefined);
        setIsSaving(false);
    }
    
    useEffect(() => {
        if (isOpen) {
            if (isEditing && block) {
                if (blockType !== block.type) { // only reset fully if type changes
                     resetState();
                }
                setBlockType(block.type);
                setTitle(block.title || '');
                if (block.type === 'text') setTextContent(block.text?.content || '');
                if (block.type === 'photo') {
                    setSelectedAsset(assets.find(a => a.id === block.photo?.assetId));
                    setPhotoCaption(block.photo?.caption || '');
                }
                if (block.type === 'video') setSelectedAsset(assets.find(a => a.id === block.video?.assetId));
                if (block.type === 'audio') setSelectedAsset(assets.find(a => a.id === block.audio?.assetId));
            } else if (!isEditing && !blockType) {
                 resetState();
            }
        }
    }, [block, isOpen, isEditing, assets, blockType]);


    const handleUploadCompleted = (newAsset: Asset) => {
        onUploadSuccess(newAsset);
        setSelectedAsset(newAsset); // Automatically select the new asset
        toast({ title: 'アップロード完了', description: `${newAsset.name}が選択されました。` });
    }

    const handleSave = async () => {
        if (!blockType) {
            toast({ variant: 'destructive', title: 'エラー', description: 'ブロックタイプを選択してください。' });
            return;
        }

        if (['photo', 'video', 'audio'].includes(blockType) && !selectedAsset?.id) {
             toast({ variant: 'destructive', title: 'エラー', description: 'メディアファイルを選択またはアップロードしてください。' });
            return;
        }

        setIsSaving(true);

        try {
            const newBlockData: any = { type: blockType, title, visibility: 'show' };
            if (blockType === 'text') newBlockData.text = { content: textContent };
            if (blockType === 'photo') newBlockData.photo = { assetId: selectedAsset!.id, caption: photoCaption };
            if (blockType === 'video') newBlockData.video = { assetId: selectedAsset!.id };
            if (blockType === 'audio') newBlockData.audio = { assetId: selectedAsset!.id };
            
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
                <Select onValueChange={(value) => { setSelectedAsset(assets.find(a => a.id === value)); }} value={selectedAsset?.id}>
                    <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
                    <SelectContent>
                        {availableAssets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <MediaUploader
                    assetType={type}
                    accept={`${type}/*`}
                    memoryId={memory.id}
                    onUploadSuccess={handleUploadCompleted}
                >
                    <Button type="button" variant="outline" size="icon">
                        <Upload className="h-4 w-4"/>
                    </Button>
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
                             <div className="w-full aspect-video bg-muted rounded-md flex items-center justify-center relative">
                                 {selectedAsset.thumbnailUrl ? (
                                    <Image src={selectedAsset.thumbnailUrl} alt="サムネイル" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover rounded-md" />
                                 ) : (
                                     <div className="text-muted-foreground flex flex-col items-center gap-2">
                                       <Loader2 className="h-6 w-6 animate-spin"/>
                                       <span className="text-xs">サムネイル準備中...</span>
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
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {getSaveButtonText()}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
