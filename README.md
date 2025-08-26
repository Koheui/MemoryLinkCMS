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

## Setup Instructions (From Zero to Launch)

Follow these steps to get the project running.

### 1. Firebase Project Setup
- Create a new Firebase project.
- Ensure all services (Firestore, Storage, Functions) are in the same region (e.g., `asia-northeast1`).

### 2. Configure Firebase Authentication
- In the Firebase Console, go to **Authentication** -> **Sign-in method**.
- Enable **Email/Password**.
- Go to the **Settings** tab within Authentication.
- Under **Authorized domains**, click **Add domain**.
- **Crucially, add both your local development domain and your final production domain:**
    - `localhost`
    - `memorylink-cms.web.app` (or your custom domain if you have one)
- **⚠️ This step is critical. If you don't authorize your production domain, logins will fail after deployment.**

### 3. Configure Google Cloud API Key
- Go to the [Google Cloud Console Credentials page](https://console.cloud.google.com/apis/credentials).
- Find the API key used by your web app (usually named "Browser key (auto created by Firebase)").
- Click on the key name to edit it.
- Under **Application restrictions**, select **Websites**.
- Under **Website restrictions**, click **Add**.
- **Add entries for both local development and production:**
    - `http://localhost:3000` (or your local port)
    - `https://memorylink-cms.web.app/*`
- **⚠️ This is also critical. If you don't restrict your API key correctly, your app will not be able to connect to Firebase services in production.**
- Click **Save**.

### 4. Set Environment Variables
- In the Firebase Console, go to **Project Settings** (the gear icon).
- Scroll down to the **Your apps** card.
- If you haven't created a web app yet, click the web icon (`</>`) to create one.
- Find your web app and click on **Config** to view your Firebase configuration keys.
- Create a new file named `.env.local` in the root of your project.
- Add your Firebase configuration keys to this new `.env.local` file. It should look like this:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 5. Install Dependencies & Run App
- Install the project dependencies and start the development server.
```bash
npm install
npm run dev
```
- The application should now be running locally (e.g., `http://localhost:3000`).

### 6. Grant Admin Privileges (Optional)
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

### 7. Deploy to Firebase Hosting
- Once all the configuration is complete, build and deploy the application.
```bash
npm run build
firebase deploy
```
