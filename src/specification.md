想い出リンクCMS 仕様書（最終版 / Firebase Studio向け）
0. 概要と前提

目的：ユーザーが写真/動画/音声/テキストで「想い出ページ」を作り、**スマホ最適UIの公開ページ（個別URL）**をNFCタグから閲覧できるようにする。

課金：買い切り（非サブスク）。ランニングは静的配信＋強キャッシュで最小化。

技術：Firebaseのみ（Hosting / Auth / Firestore / Storage / Functions）。Airtable不使用。

役割：

*   **一般ユーザー（Email+PWでログイン）**… 招待を受けてページを編集・公開する。
*   **管理者（Custom Claimsでadmin）**… 注文（顧客）管理、ページ発行、NFC書込、進捗管理を行う。

ドメイン構成（推奨・変更可）

*   LP（ランディング）：https://www.example.com（静的・説明・申込導線のみ。Auth不要）
*   アプリ（編集/管理/ダッシュボード）：https://app.example.com（Auth必須）
*   公開ページ（閲覧/NFC）：https://mem.example.com（Auth不要、静的のみ）

1. ユーザー体験フロー（UX）
### 1.1 管理者側のオペレーション（顧客管理フロー）

1.  **注文の作成（招待）**: 管理者は、提携先（葬儀社、ベビー用品店など）からの依頼に基づき、管理画面で新しい**注文（Order）**を作成する。この際、顧客のメールアドレスと製品タイプ（カード、キーホルダー等）を登録する。これが顧客への「招待状」となる。
2.  **ページIDの発行**: 注文が作成されると、システムは自動的にユニークな**想い出ページ（Memory）**を生成し、そのID（`memoryId`）を注文に紐付ける。この`memoryId`が公開ページのURLの一部となる。
3.  **NFCタグへの書込**: 管理者は、発行された`memoryId`を含む公開URL（例: `https://mem.example.com/p/{memoryId}`）をNFCタグに書き込み、物理製品に貼り付けて出荷準備を行う。
4.  **進捗管理**: 管理者は、ダッシュボードで注文のステータス（支払い済、発送済など）を更新する。

### 1.2 一般ユーザー側のフロー

1.  **招待とサインアップ**: 顧客は、管理者から招待された自身のメールアドレスと、任意のパスワードでアプリにサインアップ（アカウント作成）する。
2.  **自動的な権限付与**: ログインすると、システムはメールアドレスを照合し、招待されていたページの編集権限をユーザーに自動で付与する。ユーザーは秘密鍵などを入力する必要はない。
3.  **ページの編集**: ユーザーは、自分に割り当てられた「想い出ページ」のカバー写真、プロフィール、テキスト、メディアブロックなどを自由に編集する。
4.  **公開**: 編集が完了したら、「公開」ボタンを押す。これにより、Functionsがトリガーされ、NFCタグからアクセスできる静的な公開ページが生成・更新される。

2. データモデル（Firestore / Storage）
2.1 Firestore
users/{uid}
  email, displayName?
  createdAt, updatedAt

memories/{memoryId}                 // 想い出コンテナ（1公開ページに相当）
  ownerUid: string | null            // ユーザーが有効化するまでnull
  title: string
  type: "pet" | "birth" | "memorial" | "other"
  status: "draft" | "active" | "archived"
  publicPageId: string | null
  coverAssetId: string | null
  profileAssetId: string | null
  createdAt, updatedAt

memories/{memoryId}/assets/{assetId}
  ownerUid: string // Denormalized for rules
  name: string
  type: "image" | "video" | "audio"
  storagePath: string
  url: string
  size: number
  createdAt

orders/{orderId}                    // 顧客・進捗管理の中核
  userUid: string | null             // ユーザーが有効化するまでnull
  email: string                      // 招待された顧客のメールアドレス
  memoryId: string                   // 対応するmemoryのID
  productType: string                // 例: 'card', 'keychain'
  status: "draft" | "paid" | "shipped" | "delivered"
  note?: string
  payment: { method?: "stripe"|"invoice", linkUrl?: string, paidAt?: Timestamp }
  shipping: { nfcWritten?: boolean, shippedAt?: Timestamp }
  createdAt, updatedAt, audit: { createdBy?: string, lastUpdatedBy?: string }

publicPages/{pageId}                // 公開メタ（閲覧専用）
  memoryId: string
  title: string
  about: { text: string, format: "md" | "plain" }
  design: { theme: "light"|"dark"|"cream"|"ink", accentColor: string, bgColor: string, fontScale: number }
  media: { cover: { url, width, height }, profile: { url, width, height } }
  ordering: "custom" | "dateDesc"
  publish: { status: "draft" | "published", publishedAt?: Timestamp }
  createdAt, updatedAt

publicPages/{pageId}/blocks/{blockId} // 編集側ブロック（writeはFunctions経由推奨）
  type: "album" | "video" | "audio" | "text"
  order: number
  visibility: "show" | "hide"
  title?: string
  body?: string
  album?: { layout: "grid"|"carousel", cols?: 2|3, items: [{ src, thumb?, caption? }] }
  video?: { src, poster? }
  audio?: { src }
  text?: { content }
  createdAt, updatedAt

2.2 Storage
# 編集（非公開）
users/{uid}/memories/{memoryId}/uploads/{fileId}.{ext}

# 公開（閲覧のみ、Functionsが書込）
deliver/publicPages/{pageId}/cover.jpg
deliver/publicPages/{pageId}/profile.jpg
deliver/publicPages/{pageId}/gallery/{fileId}.jpg
deliver/publicPages/{pageId}/thumbs/{fileId}.jpg
deliver/publicPages/{pageId}/video/{fileId}.mp4
deliver/publicPages/{pageId}/audio/{fileId}.mp3
deliver/publicPages/{pageId}/manifest.json

3. セキュリティルール（そのまま反映OK）
3.1 Firestore（firestore.rules）
rules_version = '2';

function isSignedIn() { return request.auth != null; }
function isAdmin() { return isSignedIn() && request.auth.token.role == 'admin'; }
function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }

service cloud.firestore {
  match /databases/{database}/documents {

    // User can only read/write their own user document
    match /users/{uid} {
      allow read, write: if isOwner(uid) || isAdmin();
    }

    // Memories can only be read/written by their owner or an admin
    match /memories/{memoryId} {
      allow read, write: if isOwner(resource.data.ownerUid) || isAdmin();
    }

    // Subcollection assets
    match /memories/{memoryId}/assets/{assetId} {
       allow read, write: if isOwner(get(/databases/$(database)/documents/memories/$(memoryId)).data.ownerUid) || isAdmin();
    }

    // Orders are read-only for clients, write is admin-only.
    match /orders/{orderId} {
      allow read, write: if isAdmin();
      // To allow users to see their own orders:
      // allow read: if isAdmin() || isOwner(resource.data.userUid);
      // allow write: if isAdmin();
    }

    // Public pages are read-only for everyone, and cannot be written by clients.
    match /publicPages/{pageId} {
      allow read: if true;
      allow write: if false;
    }

    // Blocks cannot be edited directly by clients.
    match /publicPages/{pageId}/blocks/{blockId} {
      allow read: if false;
      allow write: if false;
    }
  }
}

3.2 Storage（storage.rules）
rules_version = '2';

function isSignedIn() { return request.auth != null; }
function isAdmin() { return isSignedIn() && request.auth.token.role == 'admin'; }
function isUser(uid) { return isSignedIn() && request.auth.uid == uid; }

function isAllowedContentType() {
  return request.resource != null && (
    request.resource.contentType.matches('image/.*') ||
    request.resource.contentType.matches('video/.*') ||
    request.resource.contentType.matches('audio/.*')
  );
}
function withinSizeLimit() {
  return request.resource != null && (
    (request.resource.contentType.matches('image/.*') && request.resource.size < 25 * 1024 * 1024) ||
    (request.resource.contentType.matches('video/.*') && request.resource.size < 200 * 1024 * 1024) ||
    (request.resource.contentType.matches('audio/.*') && request.resource.size < 30 * 1024 * 1024)
  );
}

service firebase.storage {
  match /b/{bucket}/o {

    // User can write to their own memory folders
    match /users/{uid}/{path=**} {
      allow read, write: if isUser(uid) && isAllowedContentType() && withinSizeLimit();
    }

    // Public delivery assets are read-only for everyone, and cannot be written.
    match /deliver/publicPages/{pageId}/{all=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}


反映コマンド

firebase deploy --only firestore:rules,storage:rules

4. 認証（Auth）— 落とさない超丁寧ガイド
4.1 Console設定（必須チェック）

*   Authentication → Sign-in method
    *   Email/Password: Enabled
*   Authentication → Authorized domains
    *   localhost / 127.0.0.1（開発）
    *   app.example.com（本番アプリ）
*   App Check
    *   MVPはOFF（ONにする場合はWebキー設定＋SDK実装が必要）
*   リージョン統一
    *   Firestore/Storage/Functionsは同一リージョン（例：asia-northeast1）

4.2 管理者（admin）付与（最初の1回だけ）

*   安全な環境で実行（Admin SDK）
    ```javascript
    import { initializeApp, applicationDefault } from "firebase-admin/app";
    import { getAuth } from "firebase-admin/auth";
    initializeApp({ credential: applicationDefault() });
    await getAuth().setCustomUserClaims("<ADMIN_UID>", { role: "admin" });
    ```
*   付与後、そのユーザーは「再ログイン」必須（トークン再発行のため）

4.3 管理画面の保護：Session Cookie + middleware（直打ちも404）

*   管理者が通常ログイン→idToken取得
*   APIへidTokenをPOST→HTTP only Session Cookieを発行
*   Next.js middlewareが /_admin/** でそのCookieをサーバー検証
*   role=adminのみ通す／それ以外は404へ偽装

5. 画面仕様
5.1 アプリ（app.example.com）

*   `/signup`, `/login`：Email/Pass
*   `/dashboard`：自分のMemories一覧（公開URL/QR、編集/公開）
*   `/memories/{memoryId}`：
    *   Design：カバー/プロフィール/テーマ/フォント倍率
    *   About：概要（Markdown）
    *   Blocks：Album/Video/Audio/Text 追加・並べ替え・非表示
    *   Publish：プレビュー→公開ビルド（Functions）→URL/QR表示
*   `/_admin/**`（**顧客管理システム**）
    *   **注文管理**: 顧客一覧（orders）表示、ステータス遷移（入金確認、発送済みなど）
    *   **新規注文作成**: 顧客メールと製品タイプを入力して新しい注文（招待）を作成
    *   **ページID確認**: 注文に紐づく公開ページID（`memoryId`）を確認し、NFC書き込み作業に利用
    *   **保護**: Session Cookie + middleware で保護（非adminは常に404）

5.2 公開（mem.example.com）

*   `/p/{pageId}`：
    *   最初に deliver/publicPages/{pageId}/manifest.json を取得
    *   スマホ向けリンク集UIで描画（CDNキャッシュ重視、Firestore直読なし）
    *   OGP設定（カバーをog:image）

5.3 LP（www.example.com）

*   説明・料金・FAQ・はじめる→/signup（アプリへリンク）
*   LP自体は静的でOK（Auth不要）

6. Functions 概要
6.1 画像圧縮（onFinalize）

*   トリガ：users/{uid}/memories/{memoryId}/uploads/*
*   出力：proc/.../images/*_w1600.jpg と proc/.../thumbs/*_w400.jpg（sharp）

6.2 公開ビルド（HTTPS）

*   POST /api/generate-public-page { memoryId }
*   認可：memory.ownerUid == uid もしくは admin
*   手順：
    1.  Firestoreから編集データ（memories, blocks）取得
    2.  参照する proc/** を deliver/publicPages/{pageId}/** にコピー
    3.  manifest.json 生成（デザイン/順序/URL群）
    4.  memories.status="active" / publishedAt 更新

7. キャッシュ/コスト（firebase.json）
```json
{
  "hosting": {
    "headers": [
      { "source": "/p/**", "headers": [ { "key": "Cache-Control", "value": "public, max-age=300" } ] },
      { "source": "/deliver/**", "headers": [ { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" } ] }
    ]
  }
}
```

8. 受け入れ基準（UAT）

*   サインアップ/ログイン→招待されたページを編集→公開→/p/{pageId} 表示
*   Firestore停止想定でも公開ページは表示（manifest.json＋静的ファイルのみ）
*   他人のmemoriesにアクセス不可
*   /_admin 非adminは常に404、adminは入れる
*   管理画面から注文作成→ユーザー招待→ユーザーがページ編集できる
*   NFC：iOS/AndroidでURL起動可

9. セットアップ手順（ゼロ→起動）

1.  Firebaseプロジェクト作成（リージョン統一）
2.  Auth：Email/PassをEnabled、Authorized domains に localhost・app.example.com
3.  ルール反映
    `firebase deploy --only firestore:rules,storage:rules`
4.  Functions（画像圧縮/公開ビルド）を配置→
    `cd functions && npm i && npm run deploy`
5.  Hosting（アプリ/公開をビルド&デプロイ）→
    `npm run build && firebase deploy --only hosting`
6.  管理者付与（Admin SDKで role:"admin"）→管理者は再ログイン

10. 補足（運用/拡張）

*   決済はMVPで請求書→のちにStripe Webhook連携へ拡張。
*   個人情報は公開ページに載せない運用。
*   **マルチテナント**: サービス（赤ちゃん筆、ペット追悼など）ごとにドメインを分け、同じアプリで運用する。アプリはドメインを判別し、表示するロゴやテーマ、フィルタリングするページ種別（`memories.type`）を動的に切り替える。
```