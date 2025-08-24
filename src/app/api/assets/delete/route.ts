// src/app/api/assets/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUidFromRequest } from '../../_lib/auth';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getStorage } from 'firebase-admin/storage';
import type { Asset, Memory } from '@/lib/types';
const { getFirestore, Filter } = require('firebase-admin/firestore');

function err(status: number, msg: string) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    if (!uid) {
      return err(401, 'UNAUTHENTICATED: Invalid or missing token.');
    }
    
    const body = await req.json();
    const { assetId } = body;

    if (!assetId) {
        return err(400, "リクエストに assetId がありません。");
    }

    const db = getFirestore(getAdminApp());
    const storage = getStorage(getAdminApp());
    const assetRef = db.collection('assets').doc(assetId);
    
    const assetDoc = await assetRef.get();
    if (!assetDoc.exists) {
        return err(404, "指定されたアセットが見つかりません。");
    }

    const assetData = assetDoc.data() as Asset;
    if (assetData.ownerUid !== uid) {
        return err(403, "このアセットを削除する権限がありません。");
    }
    
    // --- Step 1: Delete file from Storage ---
    if (assetData.storagePath) {
        try {
            await storage.bucket().file(assetData.storagePath).delete();
            // Also attempt to delete all thumbnail candidates if it's a video
            if (assetData.type === 'video' && assetData.thumbnailCandidates && assetData.thumbnailCandidates.length > 0) {
                 const path = require('path');
                 const thumbDir = path.join(path.dirname(assetData.storagePath), "thumbnails");
                 assetData.thumbnailCandidates.forEach(async (thumbUrl) => {
                     try {
                        const url = new URL(thumbUrl);
                        const pathname = decodeURIComponent(url.pathname);
                        const fileName = path.basename(pathname);
                        const thumbPath = path.join(thumbDir, fileName);
                        await storage.bucket().file(thumbPath).delete().catch(e => console.warn(`Could not delete thumbnail ${thumbPath}:`, e.message));
                     } catch(e) {
                         console.error("Could not parse thumbnail URL to delete from storage:", thumbUrl, e)
                     }
                 });
            }
        } catch (storageError: any) {
            // Log but don't block if file deletion fails (e.g., already deleted)
            console.warn(`Storage file deletion failed for ${assetData.storagePath}, but continuing:`, storageError.message);
        }
    }

    const batch = db.batch();

    // --- Step 2: Delete the asset document itself ---
    batch.delete(assetRef);
    
    // --- Step 3: Remove this asset from any memory that uses it ---
    // Remove from coverAssetId or profileAssetId
    const memoriesUsingAssetQuery = db.collection('memories')
        .where('ownerUid', '==', uid)
        .where(Filter.or(
            Filter.where('coverAssetId', '==', assetId),
            Filter.where('profileAssetId', '==', assetId)
        ));
    
    const memoriesSnapshot = await memoriesUsingAssetQuery.get();
    memoriesSnapshot.forEach((doc: any) => {
        const memoryData = doc.data() as Memory;
        const updateData: any = {};
        if (memoryData.coverAssetId === assetId) {
            updateData.coverAssetId = null;
        }
        if (memoryData.profileAssetId === assetId) {
            updateData.profileAssetId = null;
        }
        batch.update(doc.ref, updateData);
    });

    // Remove from blocks (this part is more complex, handle via block-delete)
    // For now, we assume this is for library assets not in blocks.
    // A more complete solution would query memories containing this asset in blocks.

    await batch.commit();

    return NextResponse.json({ ok: true, message: "アセットが正常に削除されました。" }, { status: 200 });

  } catch (e: any) {
    const msg = String(e?.message || e);
    console.error("API Error in /api/assets/delete:", e);
    if (msg.includes('UNAUTHENTICATED')) {
      return err(401, '認証に失敗しました。');
    }
    return err(500, 'サーバー内部でエラーが発生しました: ' + msg);
  }
}
