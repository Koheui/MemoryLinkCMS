import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  email: string;
  displayName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Design {
  theme: 'light' | 'dark' | 'cream' | 'ink';
  fontScale: number;
}

export interface Memory {
  id: string;
  ownerUid: string;
  title: string;
  type: 'pet' | 'birth' | 'memorial' | 'other';
  status: 'draft' | 'active' | 'archived';
  publicPageId: string | null;
  coverAssetId: string | null;
  profileAssetId: string | null;
  description: string;
  design?: Design;
  createdAt: Timestamp | string; // Allow string for serialized data
  updatedAt: Timestamp | string; // Allow string for serialized data
}

export interface Asset {
  id: string;
  type: 'image' | 'video' | 'audio';
  rawPath: string;
  procPath?: string;
  thumbPath?: string;
  url?: string;
  createdAt: Timestamp | string;
}

export interface PublicPageBlock {
  id: string;
  type: 'album' | 'video' | 'audio' | 'text';
  order: number;
  visibility: 'show' | 'hide';
  title?: string;
  album?: {
    layout: 'grid' | 'carousel';
    cols?: 2 | 3;
    assetIds: string[]; 
  };
  video?: { assetId: string; };
  audio?: { assetId: string; };
  text?: { content: string; }; 
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}
