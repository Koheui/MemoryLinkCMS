import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll,
  getMetadata
} from 'firebase/storage';
import { storage } from './firebase';

// モックアップロード機能
async function mockUpload(file: File, memoryId: string, fileName: string): Promise<{ url: string; path: string }> {
  // ファイルをBase64に変換してモックURLを生成
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const mockUrl = base64;
      const mockPath = `users/${memoryId}/uploads/${fileName}`;
      resolve({ url: mockUrl, path: mockPath });
    };
    reader.readAsDataURL(file);
  });
}

// 画像アップロード
export async function uploadImage(
  file: File, 
  memoryId: string, 
  fileName: string
): Promise<{ url: string; path: string }> {
  if (!storage) {
    console.log('Mock: Uploading image:', fileName);
    return mockUpload(file, memoryId, fileName);
  }

  const storagePath = `users/${memoryId}/uploads/${fileName}`;
  const storageRef = ref(storage, storagePath);
  
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  
  return { url, path: storagePath };
}

// 動画アップロード
export async function uploadVideo(
  file: File, 
  memoryId: string, 
  fileName: string
): Promise<{ url: string; path: string }> {
  if (!storage) {
    console.log('Mock: Uploading video:', fileName);
    return mockUpload(file, memoryId, fileName);
  }

  const storagePath = `users/${memoryId}/uploads/${fileName}`;
  const storageRef = ref(storage, storagePath);
  
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  
  return { url, path: storagePath };
}

// 音声アップロード
export async function uploadAudio(
  file: File, 
  memoryId: string, 
  fileName: string
): Promise<{ url: string; path: string }> {
  if (!storage) {
    console.log('Mock: Uploading audio:', fileName);
    return mockUpload(file, memoryId, fileName);
  }

  const storagePath = `users/${memoryId}/uploads/${fileName}`;
  const storageRef = ref(storage, storagePath);
  
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  
  return { url, path: storagePath };
}

// ファイル削除
export async function deleteFile(path: string): Promise<void> {
  if (!storage) {
    console.log('Mock: Deleting file:', path);
    return;
  }

  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

// ファイル一覧取得
export async function listFiles(memoryId: string): Promise<string[]> {
  if (!storage) {
    console.log('Mock: Listing files for memory:', memoryId);
    return [];
  }

  const storageRef = ref(storage, `users/${memoryId}/uploads`);
  const result = await listAll(storageRef);
  
  return result.items.map(item => item.fullPath);
}

// ファイルサイズ取得
export async function getFileSize(path: string): Promise<number> {
  if (!storage) {
    console.log('Mock: Getting file size for:', path);
    return 0;
  }

  const storageRef = ref(storage, path);
  const metadata = await getMetadata(storageRef);
  return metadata.size;
}

// ファイル名を生成
export function generateFileName(originalName: string, type: string): string {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  return `${type}_${timestamp}.${extension}`;
}

// ファイルタイプを判定
export function getFileType(file: File): 'image' | 'video' | 'audio' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  throw new Error('Unsupported file type');
}
