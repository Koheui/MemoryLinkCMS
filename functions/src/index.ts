/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions/v2";
import {onObjectFinalized} from "firebase-functions/v2/storage";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import ffmpeg from "fluent-ffmpeg";

admin.initializeApp();

// Set the region to match the project's region (e.g., asia-northeast1)
setGlobalOptions({region: "asia-northeast1"});

// This is the correct signature for the onObjectFinalized trigger.
export const generateThumbnail = onObjectFinalized({
  cpu: 1,
  memory: "512MiB",
  timeoutSeconds: 60,
}, async (event) => {
  const fileBucket = event.data.bucket;
  const filePath = event.data.name;
  const contentType = event.data.contentType;
  const customMetadata = event.data.metadata;
  
  // Get the assetId from the custom metadata
  const assetId = customMetadata?.assetId;

  // Exit if this is not a user asset (check path and required metadata)
  if (!filePath || !filePath.startsWith("users/") || !assetId) {
    logger.info(`Not a user asset with required metadata, skipping: ${filePath}`);
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
  const thumbFileName = `thumb_${path.parse(fileName).name}.jpg`;
  const tempThumbPath = path.join(os.tmpdir(), thumbFileName);
  
  try {
    // 1. Download video from bucket
    logger.info(`Starting download for: ${filePath}`);
    await bucket.file(filePath).download({destination: tempFilePath});
    logger.info("Video downloaded locally to", tempFilePath);

    // 2. Generate a thumbnail using ffmpeg, wrapped in a promise for async/await
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
            timestamps: ["1%"],
            filename: thumbFileName,
            folder: os.tmpdir(),
            size: "320x240",
          });
    });

    // 3. Upload the thumbnail to a 'thumbnails' subfolder
    const thumbUploadPath = path.join(path.dirname(filePath), "thumbnails", thumbFileName);
    const [uploadedFile] = await bucket.upload(tempThumbPath, {
      destination: thumbUploadPath,
      metadata: {contentType: "image/jpeg"},
    });
    
    logger.info(`Thumbnail uploaded to ${thumbUploadPath}`);

    // 4. Get a Signed URL for the thumbnail, which is more reliable than a public URL.
    const expires = new Date("2100-01-01"); // Set a very distant expiration date
    const [thumbnailUrl] = await uploadedFile.getSignedUrl({
        action: "read",
        expires: expires,
    });

    logger.info("Generated signed URL:", thumbnailUrl);

    // 5. Update the corresponding document in Firestore using the assetId from metadata
    const db = admin.firestore();
    const assetRef = db.collection("assets").doc(assetId);
    
    await assetRef.update({
      thumbnailUrl: thumbnailUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("Firestore document updated for asset:", assetId);

  } catch (error) {
    logger.error("Function failed:", error);
  } finally {
    // 6. Clean up temporary files regardless of success or failure
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    if (fs.existsSync(tempThumbPath)) fs.unlinkSync(tempThumbPath);
    logger.info("Cleaned up temporary files.");
  }
});
