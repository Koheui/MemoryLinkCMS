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
import { Memory, Asset, PublicPage, ClaimRequest, Order } from '@/types';

// Memories
export const memoriesCollection = collection(db, 'memories');

export async function getMemoriesByUser(ownerUid: string): Promise<Memory[]> {
  const q = query(
    memoriesCollection,
    where('ownerUid', '==', ownerUid),
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
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as Memory;
}

export async function createMemory(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(memoriesCollection, {
    ...memory,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return docRef.id;
}

export async function updateMemory(memoryId: string, updates: Partial<Memory>): Promise<void> {
  const docRef = doc(db, 'memories', memoryId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMemory(memoryId: string): Promise<void> {
  const docRef = doc(db, 'memories', memoryId);
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
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as PublicPage;
}

export async function createPublicPage(page: Omit<PublicPage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(publicPagesCollection, {
    ...page,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return docRef.id;
}

export async function updatePublicPage(pageId: string, updates: Partial<PublicPage>): Promise<void> {
  const docRef = doc(db, 'publicPages', pageId);
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
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as ClaimRequest;
}

// Orders (Read only for client)
export const ordersCollection = collection(db, 'orders');

export async function getOrdersByTenant(tenant: string): Promise<Order[]> {
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
