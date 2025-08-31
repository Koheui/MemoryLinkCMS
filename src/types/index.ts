export interface User {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Memory {
  id: string;
  ownerUid: string;
  title: string;
  type: 'personal' | 'family' | 'business';
  status: 'draft' | 'published';
  publicPageId?: string;
  coverAssetId?: string;
  profileAssetId?: string;
  coverImage?: string;
  description?: string;
  design: {
    theme: string;
    layout: string;
    colors: {
      primary: string;
      secondary: string;
      background: string;
    };
    header?: {
      backgroundColor?: string;
      textColor?: string;
      titleFontSize?: 'small' | 'medium' | 'large';
      descriptionFontSize?: 'small' | 'medium' | 'large';
    };
  };
  blocks: Block[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Block {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'album';
  order: number;
  visibility: 'public' | 'private';
  content: {
    text?: string;
    images?: string[];
    video?: string;
    audio?: string;
    albumId?: string;
    style?: {
      fontSize?: 'small' | 'medium' | 'large';
      textAlign?: 'left' | 'center' | 'right';
      color?: string;
      backgroundColor?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  memoryId: string;
  ownerUid: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  storagePath: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  duration?: number; // 動画・音声の長さ（秒）
  resolution?: { width: number; height: number }; // 動画の解像度
  createdAt: Date;
  updatedAt: Date;
}

export interface Album {
  id: string;
  memoryId: string;
  ownerUid: string;
  title: string;
  description?: string;
  coverImage?: string;
  assets: string[]; // Asset IDs
  layout: 'grid' | 'masonry' | 'carousel';
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicPage {
  id: string;
  memoryId: string;
  title: string;
  about?: string;
  design: {
    theme: string;
    layout: string;
    colors: {
      primary: string;
      secondary: string;
      background: string;
    };
  };
  media: {
    cover?: string;
    profile?: string;
  };
  ordering: string[];
  publish: {
    status: 'draft' | 'published';
    version: number;
    publishedAt?: Date;
  };
  access: {
    public: boolean;
    password?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  tenant: string;
  emailHash: string;
  memoryId: string;
  productType: string;
  status: 'draft' | 'paid' | 'nfcReady' | 'shipped' | 'delivered';
  print: {
    qrPrinted: boolean;
    printedAt?: Date;
  };
  nfc: {
    written: boolean;
    device?: string;
    operator?: string;
    writtenAt?: Date;
    prevUrl?: string;
  };
  shipping: {
    packed: boolean;
    packedAt?: Date;
    shipped: boolean;
    shippedAt?: Date;
    trackingNo?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  audit: {
    createdBy?: string;
    lastUpdatedBy?: string;
  };
}

export interface ClaimRequest {
  id: string;
  email: string;
  tenantId: string;
  lpId: string;
  origin: string;
  ip: string;
  ua: string;
  recaptchaScore: number;
  status: 'pending' | 'sent' | 'claimed' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  actorUid?: string;
  action: string;
  target: string;
  payload: any;
  ts: Date;
}
