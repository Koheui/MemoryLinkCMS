import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
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
  // For UI display
  coverImageUrl?: string | null;
}

export interface Asset {
  id: string;
  name: string;
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

export interface Order {
    id: string;
    userUid: string;
    memoryId: string;
    status: 'draft' | 'assets_uploaded' | 'model_ready' | 'selected' | 'paid' | 'delivered';
    note?: string;
    candidateModelIds?: string[];
    selectedModelId?: string | null;
    payment?: { method?: 'stripe' | 'invoice', linkUrl?: string, paidAt?: Timestamp };
    shipping?: { nfcWritten?: boolean, shippedAt?: Timestamp };
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
    // For UI display
    userEmail?: string;
    memoryTitle?: string;
}
