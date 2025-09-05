import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { ClaimRequest, Memory } from '@/types';
import { getTenantFromOrigin, logSecurityEvent } from '@/lib/security/tenant-validation';

export function validateClaimKey(key: string): boolean {
  // 基本的な形式チェック（実際のJWT検証は別途実装）
  return Boolean(key && key.length > 10);
}

export async function getClaimRequestByKey(key: string): Promise<ClaimRequest | null> {
  try {
    const claimRef = doc(db, 'claimRequests', key);
    const claimSnap = await getDoc(claimRef);

    if (!claimSnap.exists()) {
      return null;
    }

    const claimData = claimSnap.data() as ClaimRequest;
    return { ...claimData, id: claimSnap.id };
  } catch (error) {
    console.error('Error fetching claim request:', error);
    return null;
  }
}

export async function processClaimRequest(claimRequest: ClaimRequest, userId: string, origin: string): Promise<Memory | null> {
  try {
    // Originベースのテナント検証
    const { tenant: originTenant, lpId: originLpId } = getTenantFromOrigin(origin);
    if (originTenant !== claimRequest.tenant || originLpId !== claimRequest.lpId) {
      logSecurityEvent('cross_tenant_claim_attempt', userId, originTenant, {
        claimTenant: claimRequest.tenant,
        claimLpId: claimRequest.lpId,
        origin: origin,
        status: 'denied'
      });
      throw new Error('テナント情報が一致しません');
    }

    // 新しいメモリを作成
    const newMemory: Omit<Memory, 'id'> = {
      ownerUid: userId,
      tenant: claimRequest.tenant,
      metadata: {
        lpId: claimRequest.lpId,
        source: 'claim-processor',
      },
      title: '新しい想い出ページ',
      description: 'ここに想い出を書きましょう。',
      type: 'personal',
      status: 'draft',
      publicPageId: '', // 後で公開時に設定
      design: {
        theme: 'default',
        layout: 'standard',
        colors: {
          primary: '#3B82F6',
          secondary: '#6B7280',
          background: '#FFFFFF',
        },
      },
      blocks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const memoryRef = await addDoc(collection(db, 'memories'), newMemory);

    // claimRequestsを更新
    await updateDoc(doc(db, 'claimRequests', claimRequest.id), {
      status: 'claimed',
      claimedAt: new Date(),
      claimedByUid: userId,
      memoryId: memoryRef.id,
      updatedAt: new Date(),
    });

    logSecurityEvent('claim_processed_memory_created', userId, originTenant, {
      claimId: claimRequest.id,
      memoryId: memoryRef.id
    });

    return { id: memoryRef.id, ...newMemory };
  } catch (error) {
    logSecurityEvent('process_claim_request_error', userId, claimRequest.tenant, {
      claimId: claimRequest.id,
      error: (error as Error).message
    });
    return null;
  }
}
