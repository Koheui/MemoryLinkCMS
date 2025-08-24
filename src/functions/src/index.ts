/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onObjectFinalized} from "firebase-functions/v2/storage";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import ffmpeg from "fluent-ffmpeg";

admin.initializeApp();

// This is the correct signature for the onObjectFinalized trigger for v2 Functions.
// The region and other options are passed as the first argument.
export const generateThumbnail = onObjectFinalized({
  region: "asia-northeast1", // Set the region here as per v2 SDK spec
  cpu: 1,
  memory: "512MiB",
  timeoutSeconds: 120, // Increased timeout for multiple screenshots
}, async (event) => {
  const fileBucket = event.data.bucket;
  const filePath = event.data.name;
  const contentType = event.data.contentType;
  const customMetadata = event.data.metadata;
  
  // Custom metadata should now contain the assetId.
  const assetId = customMetadata?.assetId;

  if (!filePath || !assetId) {
    logger.info(`Not a user asset with required assetId metadata, skipping: ${filePath}`);
    return;
  }

  if (!contentType?.startsWith("video/")) {
    logger.info(`Not a video, skipping: ${filePath} (${contentType})`);
    return;
  }
  
  const fileName = path.basename(filePath);
  if (fileName.startsWith("thumb_")) {
    logger.info(`Already a thumbnail, skipping: ${filePath}`);
    return;
  }

  const bucket = admin.storage().bucket(fileBucket);
  const tempFilePath = path.join(os.tmpdir(), fileName);
  const tempThumbDir = path.join(os.tmpdir(), `thumbs_${assetId}`);
  
  // Clean up previous temp directories if they exist
  if (fs.existsSync(tempThumbDir)) {
    fs.rmSync(tempThumbDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempThumbDir, {recursive: true});

  const timestamps = ["1%", "50%", "90%"];

  try {
    logger.info(`Starting download for: ${filePath}`);
    await bucket.file(filePath).download({destination: tempFilePath});
    logger.info("Video downloaded locally to", tempFilePath);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempFilePath)
        .on("end", () => {
          logger.info("Thumbnail generation finished.");
          resolve();
        })
        .on("error", (err) => {
          logger.error("Error generating thumbnails:", err);
          reject(err);
        })
        .screenshots({
          timestamps: timestamps,
          // Use a consistent naming scheme that includes the assetId
          filename: `${assetId}_thumb-%s.jpg`,
          folder: tempThumbDir,
          size: "320x240",
        });
    });
    
    const actualFilenames = fs.readdirSync(tempThumbDir);
    logger.info("Successfully generated screenshots:", actualFilenames);

    const uploadPromises = actualFilenames.map((thumbFileName) => {
        const tempThumbPath = path.join(tempThumbDir, thumbFileName);
        // Save thumbnails to a predictable path: {original_dir}/thumbnails/{thumb_filename}
        const thumbUploadPath = path.join(path.dirname(filePath), "thumbnails", thumbFileName);
        return bucket.upload(tempThumbPath, {
            destination: thumbUploadPath,
            metadata: { contentType: "image/jpeg" },
        });
    });
    
    const uploadedFiles = await Promise.all(uploadPromises);
    logger.info("All thumbnails uploaded successfully.");
    
    const expires = new Date("2100-01-01");
    const urlPromises = uploadedFiles.map(([uploadedFile]) => 
        uploadedFile.getSignedUrl({
            action: "read",
            expires: expires,
        })
    );

    const thumbnailUrls = (await Promise.all(urlPromises)).flat();
    logger.info("Generated signed URLs:", thumbnailUrls);

    const db = admin.firestore();
    const assetRef = db.collection("assets").doc(assetId);
    
    // The first thumbnail is set as the default, user can change it later.
    await assetRef.update({
      thumbnailUrl: thumbnailUrls[0] || null, 
      thumbnailCandidates: thumbnailUrls,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("Firestore document updated for asset:", assetId);

  } catch (error) {
    logger.error("Function failed:", error);
  } finally {
    // Ensure both temporary file and directory are removed
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (fs.existsSync(tempThumbDir)) {
      fs.rmSync(tempThumbDir, {recursive: true, force: true});
    }
    logger.info("Cleaned up temporary files.");
  }
});
