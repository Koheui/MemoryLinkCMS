'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Play, Pause, Volume2, VolumeX, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Asset } from '@/lib/types';

interface AudioThumbnailProps {
  asset: Asset;
  isSelected: boolean;
  onSelectionChange: (assetId: string) => void;
  onDelete: (asset: Asset) => void;
}

export function AudioThumbnail({ asset, isSelected, onSelectionChange, onDelete }: AudioThumbnailProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        <div className="aspect-square relative bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          {/* 音声アイコン */}
          <div className="text-center">
            <Music className="h-16 w-16 text-blue-500 mb-2" />
            <div className="text-sm text-blue-600 font-medium">音声ファイル</div>
          </div>
          
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
        </div>
        
        {/* ファイル情報 */}
        <div className="p-3">
          <div className="text-sm font-medium truncate" title={asset.assetId}>
            {asset.assetId}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {asset.size ? `${(asset.size / (1024 * 1024)).toFixed(1)} MB` : 'サイズ不明'}
          </div>
          
          {/* 音声コントロール */}
          <div className="mt-3 space-y-2">
            {/* 音量コントロール */}
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); toggleMute(); }}
              >
                {isMuted ? (
                  <VolumeX className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
              </Button>
              
              {/* 再生時間 */}
              <div className="text-xs text-gray-500">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
            
            {/* プログレスバー */}
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all duration-100"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      </CardContent>

      {/* 音声要素 */}
      <audio
        ref={audioRef}
        src={asset.url}
        preload="metadata"
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
      />
    </Card>
  );
}
