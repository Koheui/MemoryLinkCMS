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
  description?: string;
  design: {
    theme: string;
    layout: string;
    colors: {
      primary: string;
      secondary: string;
      background: string;
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
  content: any;
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
