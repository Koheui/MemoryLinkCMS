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
  accentColor?: string;
  bgColor?: string;
  fontScale: number;
  fontFamily?: string;
  headlineFontFamily?: string;
}

export interface Memory {
  id: string;
  ownerUid: string;
  title: string;
  status: 'draft' | 'active' | 'archived';
  publicPageId: string | null;
  coverAssetId: string | null;
  profileAssetId: string | null;
  description: string; // This is the "About" text
  design: Design;
  createdAt: Timestamp | string; // Allow string for serialized data
  updatedAt: Timestamp | string; // Allow string for serialized data
  publicUrl?: string; // For client-side use
}

// This now represents a document in the 'assets' subcollection of a 'memory'
export interface Asset {
  id: string;
  ownerUid: string;
  memoryId: string; 
  name: string;
  type: 'image' | 'video' | 'audio';
  storagePath: string; // Path in Firebase Storage
  url: string; // Public URL
  size: number;
  createdAt: Timestamp | any; // Allow any for serverTimestamp
  updatedAt: Timestamp | any; // Allow any for serverTimestamp
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
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
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
        publishedAt?: Timestamp | string;
    }
}


export interface Order {
    id: string;
    userUid: string;
    memoryId: string;
    productType: 'memory_link_card' | string; // Add productType field for future expansion
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
