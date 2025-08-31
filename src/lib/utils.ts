import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

// 動画サムネイル生成
export function generateVideoThumbnail(videoFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    video.onloadedmetadata = () => {
      // 動画の最初のフレームをキャプチャ
      video.currentTime = 0;
    };

    video.onseeked = () => {
      try {
        // キャンバスのサイズを設定
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // 動画フレームをキャンバスに描画
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // サムネイルサイズにリサイズ（最大300x300）
        const thumbnailCanvas = document.createElement('canvas');
        const thumbnailCtx = thumbnailCanvas.getContext('2d');

        if (!thumbnailCtx) {
          reject(new Error('Thumbnail canvas context not available'));
          return;
        }

        const maxSize = 300;
        let { width, height } = canvas;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        thumbnailCanvas.width = width;
        thumbnailCanvas.height = height;

        // サムネイルを描画
        thumbnailCtx.drawImage(canvas, 0, 0, width, height);

        // Base64に変換
        const thumbnailDataUrl = thumbnailCanvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnailDataUrl);
      } catch (error) {
        reject(error);
      }
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };

    // 動画ファイルを読み込み
    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.load();
  });
}

// 動画の長さを取得
export function getVideoDuration(videoFile: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    
    video.onloadedmetadata = () => {
      resolve(video.duration);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };

    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.load();
  });
}

// ファイルサイズを人間が読みやすい形式に変換
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 動画の解像度を取得
export function getVideoResolution(videoFile: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight
      });
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };

    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.load();
  });
}
