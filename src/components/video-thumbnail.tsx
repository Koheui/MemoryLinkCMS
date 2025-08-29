'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Asset } from '@/lib/types';

interface VideoThumbnailProps {
  asset: Asset;
  isSelected: boolean;
  onSelectionChange: (assetId: string) => void;
  onDelete: (asset: Asset) => void;
}

export function VideoThumbnail({ asset, isSelected, onSelectionChange, onDelete }: VideoThumbnailProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 動画サムネイル生成
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const generateThumbnail = () => {
      try {
        // 動画の読み込み完了後にサムネイルを生成
        if (video.readyState >= 2) {
          canvas.width = 300;
          canvas.height = 200;
          
          // 動画の中央部分をサムネイルとして使用
          const videoAspectRatio = video.videoWidth / video.videoHeight;
          const canvasAspectRatio = canvas.width / canvas.height;
          
          let drawWidth = canvas.width;
          let drawHeight = canvas.height;
          let offsetX = 0;
          let offsetY = 0;
          
          if (videoAspectRatio > canvasAspectRatio) {
            // 動画が横長の場合
            drawHeight = canvas.width / videoAspectRatio;
            offsetY = (canvas.height - drawHeight) / 2;
          } else {
            // 動画が縦長の場合
            drawWidth = canvas.height * videoAspectRatio;
            offsetX = (canvas.width - drawWidth) / 2;
          }
          
          ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
          
          // サムネイルURLを生成
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
          setThumbnailUrl(thumbnailUrl);
          setIsLoadingThumbnail(false);
        }
      } catch (error) {
        console.error('サムネイル生成エラー:', error);
        setIsLoadingThumbnail(false);
      }
    };

    const handleLoadedData = () => {
      // 動画の読み込み完了後にサムネイルを生成
      setTimeout(generateThumbnail, 100);
    };

    const handleTimeUpdate = () => {
      // 動画の再生位置が変更されたときにサムネイルを更新
      if (!isPlaying && video.currentTime > 0) {
        generateThumbnail();
      }
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [asset.url]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden relative group cursor-pointer transition-all duration-200",
        isSelected ? "ring-2 ring-primary ring-offset-2" : "ring-0"
      )}
      onClick={() => onSelectionChange(asset.assetId)}
    >
      {/* 選択チェックボックス */}
      <div className="absolute top-2 left-2 z-10">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={() => onSelectionChange(asset.assetId)}
          className="h-5 w-5 bg-background/80 border-white/80 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>

      {/* 削除ボタン */}
      <button 
        className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-black/50 text-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80"
        onClick={(e) => { e.stopPropagation(); onDelete(asset); }}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <CardContent className="p-0">
        <div className="aspect-video relative bg-gray-100">
          {/* 動画要素（非表示） */}
          <video
            ref={videoRef}
            src={asset.url}
            preload="metadata"
            muted={isMuted}
            onEnded={handleVideoEnded}
            className="hidden"
          />
          
          {/* サムネイル表示 */}
          {isLoadingThumbnail ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse bg-gray-200 w-full h-full" />
            </div>
          ) : thumbnailUrl ? (
            <div className="relative w-full h-full">
              {/* サムネイル画像 */}
              <img
                src={thumbnailUrl}
                alt={asset.assetId}
                className="w-full h-full object-cover"
              />
              
              {/* 再生オーバーレイ */}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-12 w-12 rounded-full bg-white/90 hover:bg-white text-gray-900"
                  onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-1" />
                  )}
                </Button>
              </div>
              
              {/* 動画コントロール */}
              <div className="absolute bottom-2 left-2 flex items-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white"
                  onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">🎬</div>
                <div className="text-sm">動画を読み込み中...</div>
              </div>
            </div>
          )}
        </div>
        
        {/* ファイル情報 */}
        <div className="p-3">
          <div className="text-sm font-medium truncate" title={asset.assetId}>
            {asset.assetId}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {asset.size ? `${(asset.size / (1024 * 1024)).toFixed(1)} MB` : 'サイズ不明'}
          </div>
        </div>
      </CardContent>

      {/* キャンバス（サムネイル生成用） */}
      <canvas ref={canvasRef} className="hidden" />
    </Card>
  );
}
