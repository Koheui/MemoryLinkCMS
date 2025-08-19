import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  email: string;
  displayName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  createdAt: Timestamp | string; // Allow string for serialized data
  updatedAt: Timestamp | string; // Allow string for serialized data
  description?: string;
}

export interface Asset {
  id: string;
  type: 'image' | 'video' | 'audio';
  rawPath: string;
  procPath?: string;
  thumbPath?: string;
  createdAt: Timestamp;
}

export interface PublicPageBlock {
  id: string;
  type: 'album' | 'video' | 'audio' | 'text';
  order: number;
  visibility: 'show' | 'hide';
  title?: string;
  body?: string;
  album?: {
    layout: 'grid' | 'carousel';
    cols?: 2 | 3;
    items: { src: string; thumb?: string; caption?: string }[];
  };
  video?: { src: string; poster?: string };
  audio?: { src: string };
  text?: { content: string };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
