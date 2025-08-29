import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Firebase Admin初期化
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * 期限切れのクレーム要求を処理するCloud Function
 * Cloud Schedulerで毎日実行される
 */
export const expireClaims = functions.pubsub
  .schedule('0 2 * * *') // 毎日午前2時に実行
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
    try {
      console.log('期限切れクレーム要求処理開始');

      const now = new Date();
      const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

      // 72時間以上前に送信され、まだsent状態のクレーム要求を検索
      const expiredClaimsQuery = await db
        .collection('claimRequests')
        .where('status', '==', 'sent')
        .where('sentAt', '<', seventyTwoHoursAgo)
        .get();

      if (expiredClaimsQuery.empty) {
        console.log('期限切れのクレーム要求はありません');
        return null;
      }

      console.log(`${expiredClaimsQuery.size}件の期限切れクレーム要求を処理します`);

      const batch = db.batch();
      const auditLogs: any[] = [];

      // 期限切れとしてマーク
      for (const doc of expiredClaimsQuery.docs) {
        const claimData = doc.data();
        
        // ステータスをexpiredに更新
        batch.update(doc.ref, {
          status: 'expired',
          updatedAt: now,
        });

        // 監査ログ用データを準備
        auditLogs.push({
          logId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          event: 'claim.expired',
          actor: 'system',
          tenant: claimData.tenant || 'default',
          lpId: claimData.lpId || 'default',
          requestId: doc.id,
          emailHash: claimData.email ? Buffer.from(claimData.email).toString('base64') : undefined,
          metadata: {
            sentAt: claimData.sentAt,
            expiredAt: now,
          },
          timestamp: now,
        });
      }

      // 一括更新を実行
      await batch.commit();
      console.log('期限切れステータスの更新完了');

      // 監査ログを記録
      const auditLogPromises = auditLogs.map(async (logData) => {
        const yyyyMMdd = logData.timestamp.toISOString().split('T')[0].replace(/-/g, '');
        await db
          .collection('auditLogs')
          .doc(yyyyMMdd)
          .collection('logs')
          .doc(logData.logId)
          .set(logData);
      });

      await Promise.all(auditLogPromises);
      console.log('監査ログ記録完了');

      console.log('期限切れクレーム要求処理完了');
      return null;

    } catch (error) {
      console.error('期限切れクレーム要求処理エラー:', error);
      throw error;
    }
  });
