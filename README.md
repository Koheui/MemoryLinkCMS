# MemoryLink CMS

This is a Next.js application for MemoryLink CMS, a platform for users to create beautiful, shareable "Memory Pages" from their photos, videos, audio, and text. The public pages are optimized for mobile and designed to be accessed via NFC tags.

## Core Features

- **Memory Page Creation**: Users can create a 'Memory Page' with a title and type.
- **Asset Uploads**: Users can upload photos, videos, and audio files to associate with their memories.
- **Content Block Management**: A flexible editor allows users to add, arrange, and edit content blocks (Album, Video, Audio, Text).
- **Design Customization**: Users can customize the look and feel of their public page, including cover images, profile photos, and themes.
- **AI-Powered Theme Suggestions**: An integrated AI assistant helps users select the perfect theme by analyzing the memory's content (title, description, photos).
- **Static Page Generation**: For performance and cost-efficiency, the app generates static HTML/JSON pages for public viewing, which are served via a CDN.
- **Admin Capabilities**: A separate admin interface (protected by session cookies and middleware) allows for managing orders, 3D models, payments, and shipping.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Styling**: Tailwind CSS with shadcn/ui
- **AI**: Google AI (Genkit)

---

## 9. Setup Instructions (From Zero to Launch)

Follow these steps to get the project running.

### 1. Firebase Project Setup
- Create a new Firebase project.
- Ensure all services (Firestore, Storage, Functions) are in the same region (e.g., `asia-northeast1`).
- **Authentication**:
  - Go to Authentication -> Sign-in method.
  - Enable **Email/Password**.
  - Go to Authentication -> Settings -> Authorized domains.
  - Add `localhost` and your app's domain (e.g., `app.example.com`).
- **App Check**: For the MVP, it's recommended to keep App Check OFF. If you enable it, you must configure the web key and implement the SDK.

### 2. Environment Variables
Create a `.env.local` file in the root of the project and add your Firebase project's configuration keys. You can get these from your Firebase project settings.

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 3. Deploy Firebase Rules
Deploy the provided security rules for Firestore and Storage. From your project root, run:
```bash
firebase deploy --only firestore:rules,storage:rules
```
*(Note: This requires `firebase.json`, `firestore.rules`, and `storage.rules` to be configured in your project root.)*

### 4. Install Dependencies & Run App
Install the project dependencies and start the development server.
```bash
npm install
npm run dev
```
The application should now be running on `http://localhost:9002`.

### 5. Grant Admin Privileges
To access the admin dashboard, you need to grant admin privileges to a user. This must be done in a secure server environment using the Firebase Admin SDK.

- **Create a user** through your app's signup flow.
- **Run a script** with the Admin SDK to set custom claims. Here is a sample Node.js script:

```javascript
// A separate script, e.g., setAdmin.js
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize the Admin SDK
initializeApp({
  credential: applicationDefault(),
  // Add your databaseURL if needed
});

const adminEmail = "admin@example.com"; // The email of the user to make an admin
const adminUid = "<ADMIN_UID>";         // The UID of the user

async function setAdminClaim() {
  try {
    await getAuth().setCustomUserClaims(adminUid, { role: "admin" });
    console.log(`Successfully set admin claim for user: ${adminEmail}`);
  } catch (error) {
    console.error("Error setting custom claims:", error);
  }
}

setAdminClaim();
```
- **Re-login**: The admin user must log out and log back in for the new claims to take effect in their ID token.

### 6. Firebase Functions
The project is designed to work with Firebase Functions for tasks like image compression and public page generation.
- Navigate to the `functions` directory (if you have one).
- Install dependencies and deploy.
```bash
cd functions
npm install
npm run deploy
```

### 7. Hosting Deployment
To deploy the application to Firebase Hosting:
```bash
npm run build
firebase deploy --only hosting
```
