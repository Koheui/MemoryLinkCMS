/**
 * クレーム処理機能
 * LPからの申し込みを処理し、メモリを作成する
 */

import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getTenantFromOrigin, logSecurityEvent } from '@/lib/security/tenant-validation';

export interface ClaimRequest {
  id: string;
  email: string;
  tenant: string;
  lpId: string;
  productType: string;
  status: 'pending' | 'sent' | 'claimed' | 'expired';
  createdAt: Date;
  updatedAt: Date;
  claimedAt?: Date;
  claimedByUid?: string;
  memoryId?: string;
}

export interface Memory {
  id: string;
  ownerUid: string;
  tenant: string;
  lpId: string;
  title: string;
  description: string;
  type: string;
  status: 'draft' | 'published' | 'shipped';
  publicPageId?: string;
  design: {
    theme: string;
    fontScale: number;
  };
  blocks: any[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * クレームキーからClaimRequestを取得
 */
export async function getClaimRequestByKey(claimKey: string): Promise<ClaimRequest | null> {
  try {
    const claimRef = doc(db, 'claimRequests', claimKey);
    const claimSnap = await getDoc(claimRef);
    
    if (!claimSnap.exists()) {
      console.error('Claim request not found:', claimKey);
      return null;
    }
    
    const data = claimSnap.data();
    return {
      id: claimSnap.id,
      email: data.email,
      tenant: data.tenant,
      lpId: data.lpId,
      productType: data.productType,
      status: data.status,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      claimedAt: data.claimedAt?.toDate(),
      claimedByUid: data.claimedByUid,
      memoryId: data.memoryId,
    };
  } catch (error) {
    console.error('Error fetching claim request:', error);
    return null;
  }
}

/**
 * クレームリクエストを処理し、メモリを作成
 */
export async function processClaimRequest(
  claimRequest: ClaimRequest,
  userId: string,
  origin: string
): Promise<Memory | null> {
  try {
    // テナント検証
    const tenantInfo = getTenantFromOrigin(origin);
    if (tenantInfo.tenant !== claimRequest.tenant) {
      console.error('Tenant mismatch:', {
        origin: tenantInfo.tenant,
        claim: claimRequest.tenant
      });
      return null;
    }
    
    // ステータスチェック
    if (claimRequest.status !== 'sent') {
      console.error('Invalid claim status:', claimRequest.status);
      return null;
    }
    
    // メモリを作成
    const memoryRef = await addDoc(collection(db, 'memories'), {
      ownerUid: userId,
      tenant: claimRequest.tenant,
      lpId: claimRequest.lpId,
      title: '新しい想い出',
      description: '',
      type: claimRequest.productType,
      status: 'draft',
      design: {
        theme: 'default',
        fontScale: 1.0,
      },
      blocks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // クレームリクエストを更新
    const claimRef = doc(db, 'claimRequests', claimRequest.id);
    await updateDoc(claimRef, {
      status: 'claimed',
      claimedAt: new Date(),
      claimedByUid: userId,
      memoryId: memoryRef.id,
      updatedAt: new Date(),
    });
    
    // セキュリティログ
    logSecurityEvent('claim_processed', userId, claimRequest.tenant, {
      claimId: claimRequest.id,
      memoryId: memoryRef.id,
      email: claimRequest.email,
      lpId: claimRequest.lpId,
      productType: claimRequest.productType
    });
    
    // 作成されたメモリを取得
    const memorySnap = await getDoc(memoryRef);
    if (!memorySnap.exists()) {
      return null;
    }
    
    const memoryData = memorySnap.data();
    return {
      id: memorySnap.id,
      ownerUid: memoryData.ownerUid,
      tenant: memoryData.tenant,
      lpId: memoryData.lpId,
      title: memoryData.title,
      description: memoryData.description,
      type: memoryData.type,
      status: memoryData.status,
      publicPageId: memoryData.publicPageId,
      design: memoryData.design,
      blocks: memoryData.blocks || [],
      createdAt: memoryData.createdAt?.toDate() || new Date(),
      updatedAt: memoryData.updatedAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error processing claim request:', error);
    return null;
  }
}

/**
 * クレームキーの有効性をチェック
 */
export function validateClaimKey(claimKey: string): boolean {
  // 基本的な形式チェック（実際のJWT検証は別途実装）
  return claimKey && claimKey.length > 10;
}
