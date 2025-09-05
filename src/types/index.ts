export interface User {
  uid: string;
  email: string;
  displayName?: string;
  tenant?: string; // テナント情報を追加
  createdAt: Date;
  updatedAt: Date;
}

export interface Memory {
  id: string;
  ownerUid: string;
  tenant: string; // テナント情報を追加
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
  metadata?: {
    petName?: string;
    petType?: string;
    source?: string;
    lpId?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Block {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'album' | 'link';
  order: number;
  visibility: 'public' | 'private';
  content: string | {
    text?: string;
    url?: string;
    alt?: string;
    [key: string]: any;
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
  resolution?: string; // 動画の解像度（例: "1920x1080"）
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
  tenant: string; // テナント情報を追加
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
  
  // Stripe決済情報
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentCompletedAt?: Date;
  
  // 注文ステータス管理
  orderStatus?: 'payment_completed' | 'photo_upload_pending' | 'production_started' | 'production_completed' | 'shipped' | 'delivered';
  
  // 秘密鍵情報
  secretKey?: string;
  secretKeyExpiresAt?: Date;
  
  // アクリルスタンド制作情報
  acrylicStand?: {
    size?: '6cm' | '10cm' | '14cm';
    photoUploaded: boolean;
    photoUrl?: string;
    photoUploadedAt?: Date;
    productionStarted: boolean;
    productionStartedAt?: Date;
    productionCompleted: boolean;
    productionCompletedAt?: Date;
  };
  
  // 住所情報
  shippingAddress?: {
    postalCode: string;
    prefecture: string;
    city: string;
    address1: string;
    address2?: string;
    name: string;
    phone: string;
  };
  
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
    deliveredAt?: Date;
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
  tenant: string;
  lpId: string;
  origin: string;
  ip: string;
  ua: string;
  recaptchaScore: number;
  status: 'pending' | 'sent' | 'claimed' | 'expired';
  sentAt?: Date;
  claimedAt?: Date;
  claimedByUid?: string;
  memoryId?: string;
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

// プロダクトタイプの定数
export const PRODUCT_TYPES = {
  ACRYLIC: 'acrylic',
  DIGITAL: 'digital',
  PREMIUM: 'premium',
  STANDARD: 'standard',
} as const;

export type ProductType = typeof PRODUCT_TYPES[keyof typeof PRODUCT_TYPES];

// プロダクトタイプの日本語名
export const PRODUCT_TYPE_NAMES: Record<ProductType, string> = {
  [PRODUCT_TYPES.ACRYLIC]: 'NFCタグ付きアクリルスタンド',
  [PRODUCT_TYPES.DIGITAL]: 'デジタル想い出ページ',
  [PRODUCT_TYPES.PREMIUM]: 'プレミアム想い出サービス',
  [PRODUCT_TYPES.STANDARD]: 'スタンダード想い出サービス',
};

// テナント情報の型定義
export interface Tenant {
  id: string;
  name: string;
  description?: string;
  allowedLpIds: string[];
  enabledProductTypes: string[];
  settings: {
    maxClaimRequestsPerHour?: number;
    emailTemplate?: string;
    branding?: {
      logo?: string;
      colors?: string[];
      theme?: string;
    };
    fulfillmentMode?: 'tenantDirect' | 'vendorDirect';
  };
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

// アクリルスタンド用写真の型定義
export interface AcrylicPhoto {
  id: string;
  orderId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  url: string;
  thumbnailUrl?: string;
  size: '6cm' | '10cm' | '14cm';
  description?: string;
  status: 'uploaded' | 'approved' | 'rejected' | 'in_production';
  uploadedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  metadata?: {
    width: number;
    height: number;
    resolution: string;
    quality: 'high' | 'medium' | 'low';
  };
}

// 配送情報の型定義
export interface ShippingInfo {
  id: string;
  orderId: string;
  trackingNumber?: string;
  status: 'pending' | 'shipped' | 'delivered' | 'returned';
  shippedAt?: Date;
  deliveredAt?: Date;
  returnedAt?: Date;
  carrier?: string;
  estimatedDelivery?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
