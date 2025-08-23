// src/app/api/blocks/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUidFromRequest } from '../../_lib/auth';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { Memory, Asset, PublicPageBlock } from '@/lib/types';

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
    const { memoryId, blockId } = body;

    if (!memoryId || !blockId) {
        return err(400, "リクエストに memoryId または blockId がありません。");
    }

    const db = getFirestore(getAdminApp());
    const storage = getStorage(getAdminApp());
    const memoryRef = db.collection('memories').doc(memoryId);
    
    const memoryDoc = await memoryRef.get();
    if (!memoryDoc.exists) {
        return err(404, "指定されたMemoryが見つかりません。");
    }

    const memoryData = memoryDoc.data() as Memory;
    if (memoryData.ownerUid !== uid) {
        return err(403, "この操作を行う権限がありません。");
    }

    const blockToDelete = memoryData.blocks.find(b => b.id === blockId);
    let deletedAssetId: string | null = null;

    if (blockToDelete) {
        const assetId = blockToDelete.photo?.assetId || blockToDelete.video?.assetId || blockToDelete.audio?.assetId;

        if (assetId) {
            const assetRef = db.collection('assets').doc(assetId);
            const assetDoc = await assetRef.get();

            if (assetDoc.exists) {
                const assetData = assetDoc.data() as Asset;
                // Delete from Storage first
                if (assetData.storagePath) {
                    try {
                        await storage.bucket().file(assetData.storagePath).delete();
                    } catch (storageError: any) {
                        // Log storage error but continue to delete from Firestore
                        console.warn(`Storage file deletion failed for ${assetData.storagePath}, but continuing:`, storageError.message);
                    }
                }
                 // Delete thumbnail from storage if it exists
                if (assetData.type === 'video' && assetData.storagePath) {
                    const path = await import('path');
                    const thumbFileName = `thumb_${path.parse(path.basename(assetData.storagePath)).name}.jpg`;
                    const thumbUploadPath = path.join(path.dirname(assetData.storagePath), "thumbnails", thumbFileName);
                    try {
                        await storage.bucket().file(thumbUploadPath).delete();
                    } catch (thumbError: any) {
                        console.warn(`Thumbnail deletion failed for ${thumbUploadPath}, but continuing:`, thumbError.message);
                    }
                }

                // Then delete from Firestore assets collection
                await assetRef.delete();
                deletedAssetId = assetId;
            }
        }
    }

    // Finally, remove the block from the memory's blocks array
    const updatedBlocks = memoryData.blocks
        .filter(b => b.id !== blockId)
        .map((b, index) => ({ ...b, order: index })); // Re-order remaining blocks

    await memoryRef.update({
        blocks: updatedBlocks,
        updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, updatedBlocks, deletedAssetId }, { status: 200 });

  } catch (e: any) {
    const msg = String(e?.message || e);
    console.error("API Error in /api/blocks/delete:", e);
    if (msg.includes('UNAUTHENTICATED')) {
      return err(401, '認証に失敗しました。');
    }
     if (msg.includes('Forbidden')) {
      return err(403, '権限がありません。');
    }
    return err(500, 'サーバー内部でエラーが発生しました: ' + msg);
  }
}
