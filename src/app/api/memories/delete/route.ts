// src/app/api/memories/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUidFromRequest } from '../../_lib/auth';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getFirestore, writeBatch, collection, query, where, getDocs } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { Memory, Asset } from '@/lib/types';
const path = require('path');

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
    const { memoryId } = body;

    if (!memoryId) {
        return err(400, "リクエストに memoryId がありません。");
    }

    const db = getFirestore(getAdminApp());
    const storage = getStorage(getAdminApp()).bucket();
    const memoryRef = db.collection('memories').doc(memoryId);
    
    const memoryDoc = await memoryRef.get();
    if (!memoryDoc.exists) {
        return err(404, "指定された想い出ページが見つかりません。");
    }

    const memoryData = memoryDoc.data() as Memory;
    if (memoryData.ownerUid !== uid) {
        return err(403, "このページを削除する権限がありません。");
    }
    
    const batch = writeBatch(db);

    // --- Step 1: Find all assets associated with this memory ---
    const assetsQuery = query(
        collection(db, 'assets'), 
        where('ownerUid', '==', uid), 
        where('memoryId', '==', memoryId) // <--- CRITICAL FIX: Only query assets for THIS memory
    );
    const assetsSnapshot = await getDocs(assetsQuery);
    
    const deletionPromises: Promise<any>[] = [];

    assetsSnapshot.forEach(doc => {
        const asset = doc.data() as Asset;
        
        // Delete from Storage
        if (asset.storagePath) {
            deletionPromises.push(storage.file(asset.storagePath).delete().catch(e => console.warn(`Could not delete file ${asset.storagePath}:`, e.message)));
            // Also attempt to delete all thumbnail candidates if it's a video
            if (asset.type === 'video' && asset.thumbnailCandidates) {
                asset.thumbnailCandidates.forEach(thumbUrl => {
                    // This is complex as URL needs to be parsed to get path. A simpler way is to delete folder if possible,
                    // but for now, we rely on a consistent naming convention.
                    // This part can be improved if thumbnail paths are stored directly.
                });
                const thumbDir = path.join(path.dirname(asset.storagePath), "thumbnails");
                // This is a more aggressive deletion strategy, might need refinement.
                // For now, deleting assets one by one is safer.
            }
        }
        // Delete asset document from Firestore
        batch.delete(doc.ref);
    });
    
    // --- Step 2: Delete the memory document itself ---
    batch.delete(memoryRef);

    // --- Step 3: Execute all deletions ---
    await Promise.all(deletionPromises); // Wait for storage deletions
    await batch.commit(); // Commit Firestore deletions

    return NextResponse.json({ ok: true, message: "ページと関連アセットが正常に削除されました。" }, { status: 200 });

  } catch (e: any) {
    const msg = String(e?.message || e);
    console.error("API Error in /api/memories/delete:", e);
    if (msg.includes('UNAUTHENTICATED')) {
      return err(401, '認証に失敗しました。');
    }
    return err(500, 'サーバー内部でエラーが発生しました: ' + msg);
  }
}
