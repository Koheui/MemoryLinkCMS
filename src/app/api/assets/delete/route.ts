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
    const { assetIds } = body;

    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
        return err(400, "リクエストに assetIds (配列) がありません。");
    }

    const db = getFirestore(getAdminApp());
    const storage = getStorage(getAdminApp());
    
    const assetsRef = db.collection('assets');
    const assetsToDeleteSnapshot = await assetsRef.where('ownerUid', '==', uid).where(admin.firestore.FieldPath.documentId(), 'in', assetIds).get();

    if (assetsToDeleteSnapshot.empty) {
        return err(404, "削除対象のアセットが見つからないか、権限がありません。");
    }

    const storageDeletionPromises: Promise<any>[] = [];
    const firestoreBatch = db.batch();

    assetsToDeleteSnapshot.forEach((doc: any) => {
        const assetData = doc.data() as Asset;
        
        // --- Step 1: Schedule Storage file deletions ---
        if (assetData.storagePath) {
            const file = storage.bucket().file(assetData.storagePath);
            storageDeletionPromises.push(file.delete().catch(e => console.warn(`Could not delete file ${assetData.storagePath}:`, e.message)));
            
            if (assetData.type === 'video' && assetData.thumbnailCandidates && assetData.thumbnailCandidates.length > 0) {
                 const path = require('path');
                 const thumbDir = path.join(path.dirname(assetData.storagePath), "thumbnails");
                 assetData.thumbnailCandidates.forEach((thumbUrl) => {
                     try {
                        const url = new URL(thumbUrl);
                        const pathname = decodeURIComponent(url.pathname);
                        const fileName = path.basename(pathname);
                        const thumbPath = path.join(thumbDir, fileName);
                        const thumbFile = storage.bucket().file(thumbPath);
                        storageDeletionPromises.push(thumbFile.delete().catch(e => console.warn(`Could not delete thumbnail ${thumbPath}:`, e.message)));
                     } catch(e) {
                         console.error("Could not parse thumbnail URL to delete from storage:", thumbUrl, e)
                     }
                 });
            }
        }
        // --- Step 2: Schedule Firestore document deletion ---
        firestoreBatch.delete(doc.ref);
    });

    // --- Step 3: Remove assetIds from any memory that uses them ---
    const memoriesUsingAssetQuery = db.collection('memories')
        .where('ownerUid', '==', uid)
        .where(Filter.or(
            Filter.where('coverAssetId', 'in', assetIds),
            Filter.where('profileAssetId', 'in', assetIds)
        ));
    
    const memoriesSnapshot = await memoriesUsingAssetQuery.get();
    memoriesSnapshot.forEach((doc: any) => {
        const memoryData = doc.data() as Memory;
        const updateData: any = {};
        if (memoryData.coverAssetId && assetIds.includes(memoryData.coverAssetId)) {
            updateData.coverAssetId = null;
        }
        if (memoryData.profileAssetId && assetIds.includes(memoryData.profileAssetId)) {
            updateData.profileAssetId = null;
        }
        firestoreBatch.update(doc.ref, updateData);
    });

    // A more complex operation would be to remove assetIds from blocks array in all memories.
    // This is computationally expensive. It's often better to handle broken links on the client.
    // For now, we are leaving this part out as per standard asset library functionality.

    // --- Step 4: Execute all scheduled operations ---
    await Promise.all(storageDeletionPromises);
    await firestoreBatch.commit();

    return NextResponse.json({ ok: true, message: `${assetIds.length}件のアセットが正常に削除されました。` }, { status: 200 });

  } catch (e: any) {
    const msg = String(e?.message || e);
    console.error("API Error in /api/assets/delete:", e);
    if (msg.includes('UNAUTHENTICATED')) {
      return err(401, '認証に失敗しました。');
    }
    return err(500, 'サーバー内部でエラーが発生しました: ' + msg);
  }
}
