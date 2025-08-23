// src/lib/types.ts
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Design {
  theme: 'light' | 'dark' | 'cream' | 'ink';
  accentColor?: string;
  bgColor?: string;
  fontScale: number;
  fontFamily?: string;
  headlineFontFamily?: string;
}

export interface Memory {
  id: string;
  ownerUid: string | null; // Can be null until claimed by a user
  title: string;
  type: "pet" | "birth" | "memorial" | "other";
  status: 'draft' | 'active' | 'archived';
  publicPageId: string | null;
  coverAssetId: string | null;
  profileAssetId: string | null;
  description: string;
  design: Design;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publicUrl?: string;
}

export interface Asset {
  id: string;
  ownerUid: string;
  memoryId: string | null; 
  name: string;
  type: 'image' | 'video' | 'audio';
  storagePath: string;
  url: string;
  size: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PublicPageBlock {
  id: string;
  type: 'album' | 'video' | 'audio' | 'text' | 'photo';
  order: number;
  visibility: 'show' | 'hide';
  title?: string;
  icon?: string;
  album?: {
    layout: 'grid' | 'carousel';
    cols?: 2 | 3;
    assetIds: string[]; 
    items?: { src: string, thumb?: string, caption?: string }[];
  };
  video?: { 
    assetId: string;
    src?: string; 
    poster?: string;
  };
  audio?: { 
    assetId: string;
    src?: string;
  };
  text?: { 
    content: string; 
  };
  photo?: {
    assetId: string;
    src?: string;
    caption?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PublicPage {
    id: string;
    memoryId: string;
    title: string;
    about: { 
        text: string, 
        format: "md" | "plain" 
    };
    design: Design & {
      // Potentially other design props from the spec
    };
    media: {
        cover: { url: string, width: number, height: number };
        profile: { url: string, width: number, height: number };
    };
    ordering: "custom" | "dateDesc";
    blocks: PublicPageBlock[];
    publish: {
        status: "draft" | "published";
        publishedAt?: Timestamp;
    }
}


export interface Order {
    id: string;
    userUid: string | null;
    memoryId: string;
    email: string;
    productType: string;
    status: 'draft' | 'assets_uploaded' | 'model_ready' | 'selected' | 'paid' | 'delivered';
    note?: string;
    candidateModelIds?: string[];
    selectedModelId?: string | null;
    payment?: { method?: 'stripe' | 'invoice', linkUrl?: string, paidAt?: Timestamp };
    shipping?: { nfcWritten?: boolean, shippedAt?: Timestamp };
    createdAt: Timestamp;
    updatedAt: Timestamp;
    // For UI display
    memoryTitle?: string;
}
