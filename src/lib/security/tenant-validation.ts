/**
 * テナント検証・セキュリティ機能
 * Originベースのテナント検証を実装し、テナント間のデータ分離を保証
 */

// Originベースのテナントマッピング
export const ORIGIN_TENANT_MAP: { [origin: string]: { tenant: string; lpId: string } } = {
  'https://emolink.cloud': { tenant: 'petmem', lpId: 'direct' },
  'https://emolink.net': { tenant: 'petmem', lpId: 'direct' },
  'https://localhost:3000': { tenant: 'petmem', lpId: 'direct' }, // 開発環境
  'http://localhost:3000': { tenant: 'petmem', lpId: 'direct' }, // 開発環境
  // 将来的なパートナーLP
  // 'https://partner-a-lp.web.app': { tenant: 'client-a', lpId: 'main' },
  // 'https://partner-b-lp.web.app': { tenant: 'client-b', lpId: 'main' },
};

/**
 * Originからテナント情報を取得（セキュリティ上重要）
 * クライアントから送信されたtenant/lpIdは絶対に信頼しない
 */
export function getTenantFromOrigin(origin: string): { tenant: string; lpId: string } {
  // Originの正規化
  const normalizedOrigin = normalizeOrigin(origin);
  
  const tenantInfo = ORIGIN_TENANT_MAP[normalizedOrigin];
  if (!tenantInfo) {
    console.error(`Unknown origin: ${origin}`);
    throw new Error(`Unknown origin: ${origin}`);
  }
  
  console.log(`Tenant validation: ${origin} -> ${tenantInfo.tenant}:${tenantInfo.lpId}`);
  return tenantInfo;
}

/**
 * Originの正規化
 */
function normalizeOrigin(origin: string): string {
  // プロトコル、ポート、パスを除去
  let normalized = origin.toLowerCase();
  
  // プロトコルを除去
  normalized = normalized.replace(/^https?:\/\//, '');
  
  // ポート番号を除去
  normalized = normalized.replace(/:\d+/, '');
  
  // パスを除去
  normalized = normalized.split('/')[0];
  
  // プロトコルを復元
  return `https://${normalized}`;
}

/**
 * テナント検証（クライアント値は無視）
 */
export function validateTenantAccess(
  userTenant: string | null,
  dataTenant: string,
  origin: string
): boolean {
  // Originベースで正しいテナントを決定
  const originTenant = getTenantFromOrigin(origin);
  
  // データのテナントとOriginのテナントが一致するかチェック
  const isValid = originTenant.tenant === dataTenant;
  
  if (!isValid) {
    console.error(`Tenant mismatch: origin=${originTenant.tenant}, data=${dataTenant}`);
  }
  
  return isValid;
}

/**
 * Firestoreクエリにテナントフィルタを追加
 */
export function addTenantFilter<T extends { tenant: string }>(
  query: any,
  tenant: string
): any {
  return query.where('tenant', '==', tenant);
}

/**
 * データアクセス権限チェック
 */
export function checkDataAccess(
  userId: string | null,
  dataTenant: string,
  origin: string
): boolean {
  if (!userId) {
    console.error('User not authenticated');
    return false;
  }
  
  return validateTenantAccess(null, dataTenant, origin);
}

/**
 * セキュリティログ
 */
export function logSecurityEvent(
  event: string,
  userId: string | null,
  tenant: string,
  details: any = {}
): void {
  console.log(`[SECURITY] ${event}:`, {
    userId,
    tenant,
    timestamp: new Date().toISOString(),
    ...details
  });
  
  // 将来的にはFirestoreのauditLogsコレクションに保存
  // await addDoc(collection(db, 'auditLogs'), {
  //   event,
  //   userId,
  //   tenant,
  //   details,
  //   timestamp: new Date()
  // });
}
