// src/lib/types.ts

// 既存の型定義
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// v3.1 新規追加の型定義

// クレーム要求の型定義
export interface ClaimRequest {
  requestId: string;
  email: string;
  tenant: string;
  lpId: string;
  productType: string;
  status: 'pending' | 'sent' | 'claimed' | 'expired' | 'canceled';
  source: 'stripe' | 'storefront' | 'lp-form';
  sentAt?: Date;
  claimedAt?: Date;
  claimedByUid?: string;
  memoryId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// メモリーの型定義（v3.1対応）
export interface Memory {
  memoryId: string;
  ownerUid: string | null;
  title: string;
  type: 'pet' | 'birth' | 'memorial' | 'other';
  status: 'draft' | 'published' | 'archived';
  publicPageId?: string;
  coverAssetId?: string;
  profileAssetId?: string;
  tenant: string;
  lpId: string;
  design: {
    theme: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    fontFamily: string;
  };
  blocks: MemoryBlock[];
  createdAt: Date;
  updatedAt: Date;
}

// メモリーブロックの型定義
export interface MemoryBlock {
  blockId: string;
  type: 'album' | 'video' | 'audio' | 'text';
  order: number;
  visibility: 'public' | 'private';
  data: AlbumBlockData | VideoBlockData | AudioBlockData | TextBlockData;
}

// 各ブロックタイプの詳細データ
export interface AlbumBlockData {
  title: string;
  description?: string;
  images: string[]; // assetIdの配列
  layout: 'grid' | 'masonry' | 'carousel';
}

export interface VideoBlockData {
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
}

export interface AudioBlockData {
  title: string;
  description?: string;
  audioUrl: string;
  duration?: number;
}

export interface TextBlockData {
  title: string;
  content: string;
  fontSize: 'small' | 'medium' | 'large';
  textAlign: 'left' | 'center' | 'right';
}

// アセット（画像・動画・音声）の型定義
export interface Asset {
  assetId: string;
  memoryId: string;
  ownerUid: string;
  type: 'image' | 'video' | 'audio';
  storagePath: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}

// 公開ページの型定義
export interface PublicPage {
  pageId: string;
  memoryId: string;
  title: string;
  about?: string;
  design: {
    theme: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    fontFamily: string;
  };
  media: {
    cover?: string;
    profile?: string;
  };
  ordering: number;
  publish: {
    status: 'draft' | 'published' | 'archived';
    version: number;
    publishedAt?: Date;
  };
  access: {
    mode: 'open' | 'passcode' | 'linkToken';
    passcode?: string;
    linkToken?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// 監査ログの型定義（v3.1対応）
export interface AuditLog {
  logId: string;
  event: 'gate.accepted' | 'claim.sent' | 'claim.used' | 'claim.expired' | 'claim.resent' | 'memory.published' | 'memory.updated';
  actor: 'system' | string; // 'system' または uid
  tenant: string;
  lpId: string;
  requestId?: string;
  memoryId?: string;
  emailHash?: string; // プライバシー保護のためハッシュ化
  metadata?: Record<string, any>;
  timestamp: Date;
}

// 注文の型定義
export interface Order {
  orderId: string;
  email: string;
  userUid?: string;
  memoryId: string;
  productType: string;
  status: 'paid' | 'shipped' | 'delivered';
  createdAt: Date;
  updatedAt: Date;
}

// テナント情報の型定義
export interface Tenant {
  tenantId: string;
  name: string;
  domain: string;
  lpId: string;
  settings: {
    theme: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    logo?: string;
    contactEmail: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// LP情報の型定義
export interface LandingPage {
  lpId: string;
  tenantId: string;
  name: string;
  url: string;
  productType: string;
  settings: {
    theme: string;
    formFields: string[];
    reCAPTCHA: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
