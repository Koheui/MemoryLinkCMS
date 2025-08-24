/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// This file is intentionally left empty.
// The new approach generates thumbnails on the client-side,
// making this Firebase Function unnecessary.
// It can be safely removed from firebase.json deployment in the future.
import * as admin from "firebase-admin";

admin.initializeApp();
