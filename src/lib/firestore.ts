import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Memory, Asset, PublicPage, ClaimRequest, Order, AcrylicPhoto, ShippingInfo } from '@/types';
import { getCurrentTenant } from './security/tenant-validation';

// Memories
export const memoriesCollection = collection(db, 'memories');

export async function getMemoriesByUser(ownerUid: string): Promise<Memory[]> {
  const currentTenant = getCurrentTenant();
  const q = query(
    memoriesCollection,
    where('ownerUid', '==', ownerUid),
    where('tenant', '==', currentTenant), // テナントフィルタリング
    orderBy('updatedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Memory[];
}

export async function getMemoryById(memoryId: string): Promise<Memory | null> {
  const docRef = doc(db, 'memories', memoryId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const memory = {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as Memory;
  
  // テナント検証
  const currentTenant = getCurrentTenant();
  if (memory.tenant !== currentTenant) {
    throw new Error('Access denied: Tenant mismatch');
  }
  
  return memory;
}

export async function createMemory(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const currentTenant = getCurrentTenant();
  const docRef = await addDoc(memoriesCollection, {
    ...memory,
    tenant: currentTenant, // テナント情報を自動設定
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return docRef.id;
}

export async function updateMemory(memoryId: string, updates: Partial<Memory>): Promise<void> {
  const docRef = doc(db, 'memories', memoryId);
  
  // 既存データのテナント検証
  const existingDoc = await getDoc(docRef);
  if (existingDoc.exists()) {
    const currentTenant = getCurrentTenant();
    if (existingDoc.data().tenant !== currentTenant) {
      throw new Error('Access denied: Tenant mismatch');
    }
  }
  
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMemory(memoryId: string): Promise<void> {
  const docRef = doc(db, 'memories', memoryId);
  
  // 既存データのテナント検証
  const existingDoc = await getDoc(docRef);
  if (existingDoc.exists()) {
    const currentTenant = getCurrentTenant();
    if (existingDoc.data().tenant !== currentTenant) {
      throw new Error('Access denied: Tenant mismatch');
    }
  }
  
  await deleteDoc(docRef);
}

// Assets
export const assetsCollection = collection(db, 'assets');

export async function getAssetsByMemory(memoryId: string): Promise<Asset[]> {
  const q = query(
    assetsCollection,
    where('memoryId', '==', memoryId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Asset[];
}

export async function createAsset(asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(assetsCollection, {
    ...asset,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return docRef.id;
}

export async function updateAsset(assetId: string, updates: Partial<Asset>): Promise<void> {
  const docRef = doc(db, 'assets', assetId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAsset(assetId: string): Promise<void> {
  const docRef = doc(db, 'assets', assetId);
  await deleteDoc(docRef);
}

// Public Pages
export const publicPagesCollection = collection(db, 'publicPages');

export async function getPublicPageById(pageId: string): Promise<PublicPage | null> {
  const docRef = doc(db, 'publicPages', pageId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const page = {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as PublicPage;
  
  // テナント検証（書き込み時のみ）
  if (typeof window !== 'undefined') {
    const currentTenant = getCurrentTenant();
    if (page.tenant !== currentTenant) {
      throw new Error('Access denied: Tenant mismatch');
    }
  }
  
  return page;
}

export async function createPublicPage(page: Omit<PublicPage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const currentTenant = getCurrentTenant();
  const docRef = await addDoc(publicPagesCollection, {
    ...page,
    tenant: currentTenant, // テナント情報を自動設定
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return docRef.id;
}

export async function updatePublicPage(pageId: string, updates: Partial<PublicPage>): Promise<void> {
  const docRef = doc(db, 'publicPages', pageId);
  
  // 既存データのテナント検証
  const existingDoc = await getDoc(docRef);
  if (existingDoc.exists()) {
    const currentTenant = getCurrentTenant();
    if (existingDoc.data().tenant !== currentTenant) {
      throw new Error('Access denied: Tenant mismatch');
    }
  }
  
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// Claim Requests (Read only for client)
export const claimRequestsCollection = collection(db, 'claimRequests');

export async function getClaimRequestById(requestId: string): Promise<ClaimRequest | null> {
  const docRef = doc(db, 'claimRequests', requestId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const request = {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as ClaimRequest;
  
  // テナント検証
  const currentTenant = getCurrentTenant();
  if (request.tenant !== currentTenant) {
    throw new Error('Access denied: Tenant mismatch');
  }
  
  return request;
}

export async function updateClaimRequest(requestId: string, updates: Partial<ClaimRequest>): Promise<void> {
  const docRef = doc(db, 'claimRequests', requestId);
  
  // 既存データのテナント検証
  const existingDoc = await getDoc(docRef);
  if (existingDoc.exists()) {
    const currentTenant = getCurrentTenant();
    if (existingDoc.data().tenant !== currentTenant) {
      throw new Error('Access denied: Tenant mismatch');
    }
  }
  
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// Orders (Read only for client)
export const ordersCollection = collection(db, 'orders');

export async function getOrdersByTenant(tenant: string): Promise<Order[]> {
  const currentTenant = getCurrentTenant();
  if (tenant !== currentTenant) {
    throw new Error('Access denied: Tenant mismatch');
  }
  
  const q = query(
    ordersCollection,
    where('tenant', '==', tenant),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Order[];
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const docRef = doc(db, 'orders', orderId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const order = {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as Order;
  
  // テナント検証
  const currentTenant = getCurrentTenant();
  if (order.tenant !== currentTenant) {
    throw new Error('Access denied: Tenant mismatch');
  }
  
  return order;
}

export async function updateOrder(orderId: string, updates: Partial<Order>): Promise<void> {
  const docRef = doc(db, 'orders', orderId);
  
  // 既存データのテナント検証
  const existingDoc = await getDoc(docRef);
  if (existingDoc.exists()) {
    const currentTenant = getCurrentTenant();
    if (existingDoc.data().tenant !== currentTenant) {
      throw new Error('Access denied: Tenant mismatch');
    }
  }
  
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// Acrylic Photos
export const acrylicPhotosCollection = collection(db, 'acrylicPhotos');

export async function getAcrylicPhotosByOrder(orderId: string): Promise<AcrylicPhoto[]> {
  const q = query(
    acrylicPhotosCollection,
    where('orderId', '==', orderId),
    orderBy('uploadedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    uploadedAt: doc.data().uploadedAt?.toDate() || new Date(),
    approvedAt: doc.data().approvedAt?.toDate(),
    rejectedAt: doc.data().rejectedAt?.toDate(),
  })) as AcrylicPhoto[];
}

export async function createAcrylicPhoto(photo: Omit<AcrylicPhoto, 'id' | 'uploadedAt' | 'approvedAt' | 'rejectedAt'>): Promise<string> {
  const docRef = await addDoc(acrylicPhotosCollection, {
    ...photo,
    uploadedAt: serverTimestamp(),
  });
  
  return docRef.id;
}

export async function updateAcrylicPhoto(photoId: string, updates: Partial<AcrylicPhoto>): Promise<void> {
  const docRef = doc(db, 'acrylicPhotos', photoId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// Shipping Info
export const shippingInfoCollection = collection(db, 'shippingInfo');

export async function getShippingInfoByOrder(orderId: string): Promise<ShippingInfo | null> {
  const q = query(
    shippingInfoCollection,
    where('orderId', '==', orderId),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    shippedAt: doc.data().shippedAt?.toDate(),
    deliveredAt: doc.data().deliveredAt?.toDate(),
    returnedAt: doc.data().returnedAt?.toDate(),
    estimatedDelivery: doc.data().estimatedDelivery?.toDate(),
  } as ShippingInfo;
}

export async function createShippingInfo(shippingInfo: Omit<ShippingInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(shippingInfoCollection, {
    ...shippingInfo,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return docRef.id;
}

export async function updateShippingInfo(shippingInfoId: string, updates: Partial<ShippingInfo>): Promise<void> {
  const docRef = doc(db, 'shippingInfo', shippingInfoId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}
