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

// Trigger on all object finalizations in the default bucket
export const generateThumbnail = storage.onObjectFinalized({
  cpu: 1,
  memory: "512MiB",
  timeoutSeconds: 60,
  bucket: process.env.GCLOUD_STORAGE_BUCKET,
}, async (event) => {
  const fileBucket = event.data.bucket;
  const filePath = event.data.name;
  const contentType = event.data.contentType;

  // This is the path pattern where media-uploader.tsx uploads files.
  // Exit if the file is not in a user's asset folder.
  if (!filePath || !filePath.startsWith("users/")) {
    logger.info(`Not a user asset, skipping: ${filePath}`);
    return;
  }

  // Exit if this is not a video.
  if (!contentType?.startsWith("video/")) {
    logger.info(`Not a video, skipping: ${filePath} (${contentType})`);
    return;
  }
  
  const fileName = path.basename(filePath);
  // Exit if the image is already a thumbnail.
  if (fileName.startsWith("thumb_")) {
    logger.info(`Already a thumbnail, skipping: ${filePath}`);
    return;
  }

  const bucket = admin.storage().bucket(fileBucket);
  const tempFilePath = path.join(os.tmpdir(), fileName);
  const metadata = {
    contentType: "image/jpeg",
  };

  try {
    // 1. Download video from bucket
    await bucket.file(filePath).download({destination: tempFilePath});
    logger.info("Video downloaded locally to", tempFilePath);

    // 2. Generate a thumbnail using ffmpeg
    const thumbFileName = `thumb_${path.parse(fileName).name}.jpg`;
    const tempThumbPath = path.join(os.tmpdir(), thumbFileName);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempFilePath)
          .on("end", () => {
            logger.info("Thumbnail generation finished.");
            resolve();
          })
          .on("error", (err) => {
            logger.error("Error generating thumbnail:", err);
            reject(err);
          })
          .screenshots({
            timestamps: [1], // Take screenshot at 1 second
            filename: thumbFileName,
            folder: os.tmpdir(),
            size: "320x240",
          });
    });

    // 3. Upload the thumbnail to a dedicated 'thumbnails' subfolder
    const thumbUploadPath = path.join(path.dirname(filePath), "thumbnails", thumbFileName);
    const [uploadedFile] = await bucket.upload(tempThumbPath, {
      destination: thumbUploadPath,
      metadata: metadata,
    });
    
    // 4. Get a Signed URL for the thumbnail
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 100); // Set expiration 100 years from now
    
    const [thumbnailUrl] = await uploadedFile.getSignedUrl({
        action: 'read',
        expires: expires,
    });

    logger.info(`Thumbnail uploaded to ${thumbUploadPath}, URL: ${thumbnailUrl}`);

    // 5. Update the corresponding document in Firestore
    const db = admin.firestore();
    const assetsRef = db.collection("assets");
    // Query for the asset document based on the original video's storage path
    const q = assetsRef.where("storagePath", "==", filePath).limit(1);
    const snapshot = await q.get();

    if (snapshot.empty) {
      logger.error("No matching asset found in Firestore for storagePath:", filePath);
      // Clean up temp files even on error
      fs.unlinkSync(tempFilePath);
      fs.unlinkSync(tempThumbPath);
      return;
    }

    const assetDoc = snapshot.docs[0];
    await assetDoc.ref.update({
      thumbnailUrl: thumbnailUrl, // Store the public URL
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("Firestore document updated for asset:", assetDoc.id);

    // 6. Clean up temporary files
    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(tempThumbPath);
  } catch (error) {
    logger.error("Function failed:", error);
  }
});
