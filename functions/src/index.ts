/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import * as logger from "firebase-functions/logger";
import {storage} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import ffmpeg from "fluent-ffmpeg";


admin.initializeApp();

setGlobalOptions({maxInstances: 10});

export const generateThumbnail = storage.onObjectFinalized({
  cpu: 1,
  memory: "512MiB",
  timeoutSeconds: 60,
}, async (event) => {
  const fileBucket = event.data.bucket;
  const filePath = event.data.name;
  const contentType = event.data.contentType;

  if (!contentType?.startsWith("video/")) {
    logger.info("This is not a video.");
    return;
  }
  if (!filePath) {
    logger.error("File path is not available.");
    return;
  }

  const fileName = path.basename(filePath);
  // Ensure we don't trigger on thumbnail uploads
  if (fileName.startsWith("thumb_")) {
    logger.info("Already a thumbnail.");
    return;
  }

  const bucket = admin.storage().bucket(fileBucket);
  const tempFilePath = path.join(os.tmpdir(), fileName);
  const metadata = {
    contentType: "image/jpeg",
  };

  try {
    await bucket.file(filePath).download({destination: tempFilePath});
    logger.info("Video downloaded locally to", tempFilePath);

    const thumbFileName = `thumb_${path.parse(fileName).name}.jpg`;
    const tempThumbPath = path.join(os.tmpdir(), thumbFileName);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempFilePath)
          .on("end", () => {
            logger.info("Thumbnail has been generated");
            resolve();
          })
          .on("error", (err) => {
            logger.error("Error generating thumbnail:", err);
            reject(err);
          })
          .screenshots({
            timestamps: ["1%"],
            filename: thumbFileName,
            folder: os.tmpdir(),
            size: "320x240",
          });
    });

    const thumbUploadPath = path.join(path.dirname(filePath), "thumbnails", thumbFileName);
    const [file] = await bucket.upload(tempThumbPath, {
      destination: thumbUploadPath,
      metadata: metadata,
    });

    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(tempThumbPath);

    const signedUrl = await file.getSignedUrl({
      action: "read",
      expires: "03-09-2491",
    });
    
    logger.info(`Thumbnail uploaded to ${thumbUploadPath}, URL: ${signedUrl[0]}`);

    const db = admin.firestore();
    const assetsRef = db.collection("assets");
    const q = assetsRef.where("storagePath", "==", filePath).limit(1);
    const snapshot = await q.get();

    if (snapshot.empty) {
      logger.error("No matching asset found in Firestore for:", filePath);
      return;
    }

    const assetDoc = snapshot.docs[0];
    await assetDoc.ref.update({
      thumbnailUrl: signedUrl[0],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("Thumbnail URL updated in Firestore for asset:", assetDoc.id);
  } catch (error) {
    logger.error("Function failed:", error);
  }
});
