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

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

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
  await bucket.file(filePath).download({destination: tempFilePath});
  logger.info("Video downloaded locally to", tempFilePath);

  const thumbFileName = `thumb_${fileName}.jpg`;
  const tempThumbPath = path.join(os.tmpdir(), thumbFileName);
  const thumbUploadPath = path.join(path.dirname(filePath), "thumbnails", thumbFileName);

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
          // Will take screens at 20%, 40%, 60% and 80% of the video
          timestamps: ["1%"],
          filename: thumbFileName,
          folder: os.tmpdir(),
          size: "320x240",
        });
  });

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

  const db = admin.firestore();
  // Find the corresponding asset in Firestore
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
});
