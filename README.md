# MemoryLink CMS

想い出リンクCMS - 写真/動画/音声/テキストで「想い出ページ」を作り、NFC/QRからスマホ最適UIで閲覧可能にするシステム

## 🚀 セットアップ

### 1. 環境変数の設定

Firebase Admin SDKを使用するために、以下の環境変数を設定してください：

```bash
# .env.local ファイルを作成
FIREBASE_PROJECT_ID=memorylink-cms
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@memorylink-cms.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

#### Firebase Admin SDK認証情報の取得方法：

1. [Firebase Console](https://console.firebase.google.com/project/memorylink-cms) にアクセス
2. プロジェクト設定 > サービスアカウント を選択
3. 「新しい秘密鍵の生成」をクリック
4. ダウンロードされたJSONファイルから以下の値を取得：
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

**注意**: `private_key`は改行文字（`\n`）を含むため、環境変数ファイルでは`"`で囲んでください。

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

## 🔧 トラブルシューティング

### Firebase Admin SDK認証エラー

**エラー**: `invalid_grant: Invalid grant: account not found`

**解決方法**:
1. サービスアカウントキーが有効期限切れの可能性
2. Firebase Consoleで新しいキーを生成
3. 環境変数を更新
4. アプリケーションを再起動

### 診断APIの使用

Firebase Admin SDKの動作確認には、以下の診断APIを使用してください：

```bash
# Firebase Admin SDK診断
GET /api/test/firebase-debug

# メールリンク送信テスト
POST /api/test/email-link-only
```

## 📚 関連ドキュメント

- [開発ログ](DEVELOPMENT_LOG.md)
- [仕様書 v3.1](specification-v3.1.md)
- [実装タスク](TODOv3.1.md)

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
