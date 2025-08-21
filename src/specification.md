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

publicPages/{pageId}                // 公開メタデータ（閲覧専用）
  memoryId: string
  title: string
  about: { text: string, format: "md" | "plain" }
  design: { theme: "light"|"dark"|"cream"|"ink", accentColor: string, bgColor: string, fontScale: number }
  media: { cover: { url, width, height }, profile: { url, width, height } }
  ordering: "custom" | "dateDesc"
  publish: { status: "draft" | "published", publishedAt?: Timestamp }
  createdAt, updatedAt

publicPages/{pageId}/blocks/{blockId} // 公開用ブロックデータ（編集は/memories/{id}/blocksで行う）
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
# 編集・処理中（非公開）
users/{uid}/memories/{memoryId}/uploads/{fileId}.{ext}
proc/users/{uid}/memories/{memoryId}/images/{fileId}_w1600.jpg
proc/users/{uid}/memories/{memoryId}/thumbs/{fileId}_w400.jpg

# 公開（CDN配信 / 閲覧のみ）
deliver/publicPages/{pageId}/cover.jpg
deliver/publicPages/{pageId}/profile.jpg
deliver/publicPages/{pageId}/gallery/{fileId}.jpg
deliver/publicPages/{pageId}/thumbs/{fileId}.jpg
deliver/publicPages/{pageId}/video/{fileId}.mp4
deliver/publicPages/{pageId}/audio/{fileId}.mp3
deliver/publicPages/{pageId}/manifest.json

3. セキュリティルール
3.1 Firestore（firestore.rules）
```
rules_version = '2';

function isSignedIn() { return request.auth != null; }
function isAdmin() { return isSignedIn() && request.auth.token.role == 'admin'; }
function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }

service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{uid} {
      allow read, write: if isOwner(uid) || isAdmin();
    }

    match /memories/{memoryId} {
      allow read, write: if isOwner(resource.data.ownerUid) || isAdmin();
    }

    match /memories/{memoryId}/assets/{assetId} {
       allow read, write: if isOwner(get(/databases/$(database)/documents/memories/$(memoryId)).data.ownerUid) || isAdmin();
    }

    match /orders/{orderId} {
      allow read, write: if isAdmin();
    }

    match /publicPages/{pageId} {
      allow read: if true;
      allow write: if false; // クライアントからの書き込みは禁止
    }

    match /publicPages/{pageId}/blocks/{blockId} {
      allow read: if true;
      allow write: if false; // クライアントからの書き込みは禁止
    }
  }
}
```

3.2 Storage（storage.rules）
```
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

    match /users/{uid}/{path=**} {
      allow read, write: if isUser(uid) && isAllowedContentType() && withinSizeLimit();
    }
    
    match /proc/{path=**} {
        allow read, write: if false; // サーバー(Functions)からのみ
    }

    match /deliver/publicPages/{pageId}/{all=**} {
      allow read: if true;
      allow write: if false; // Functionsからのみ
    }
  }
}
```

4. 認証フロー
（省略、`LOGIN_FIX_MEMO.md` および `LOGIN_FAILURE_ANALYSIS.md` を参照）

5. 画面仕様
5.1 アプリ（app.example.com）

*   `/signup`, `/login`：Email/Pass
*   `/dashboard`：自分のMemories一覧
*   `/memories/{memoryId}`：ビジュアルエディタ
*   `/_admin/**`：顧客管理システム
    *   注文管理、新規注文作成（招待）、ページID確認、NFC書込情報提供

5.2 公開（mem.example.com）

*   `/p/{pageId}`：静的生成されたコンテンツを表示

6. Functions 概要
6.1 画像圧縮（onFinalize）

*   トリガ：`users/{uid}/memories/{memoryId}/uploads/*`
*   処理：Web表示用に画像をリサイズ（例:幅1600px）、サムネイル生成（幅400px）
*   出力：`proc/`配下の対応するパス

6.2 公開ビルド（HTTPS）

*   トリガ：POST `/api/publish-page`
*   処理：
    1. Firestoreから編集データを取得
    2. `proc/`から必要な画像・動画を`deliver/publicPages/{pageId}/`にコピー
    3. `manifest.json`を生成
    4. `memories`のステータスを`active`に更新

7. キャッシュ戦略とコスト削減
このシステムのアーキテクチャは、買い切りモデルを維持するために、ランニングコスト（サーバー代、通信費）を最小限に抑えることを最優先に設計されている。

*   **静的コンテンツ配信**: 公開ページ(`/p/{pageId}`)は、アクセス毎にFirestoreのデータを読み取る動的なページではない。代わりに、ユーザーが「公開」したタイミングでFirebase Functionsが一度だけ`manifest.json`（ページの全情報を含むJSONファイル）と、表示に必要な画像・動画ファイルを生成する。実際の閲覧リクエストは、この静的ファイル群に対して行われる。
*   **CDNの積極活用**: 生成された静的ファイルは、Firebase HostingのCDN（コンテンツデリバリーネットワーク）によって世界中のエッジサーバーにキャッシュされる。これにより、ユーザーは最寄りのサーバーから高速に応答を受けられると同時に、バックエンドへのリクエスト数が劇的に削減され、Firestoreの読み取りコストとFunctionsの実行回数を最小限に抑える。
*   **キャッシュ制御ヘッダー**: `firebase.json`で`Cache-Control`ヘッダーを適切に設定する。特に、一度配信された画像や動画などのメディアファイルには`immutable`（不変）を指定し、長期間（例:1年間）ブラウザにキャッシュさせることで、再訪時の通信量を削減する。
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
*   **画像・動画の最適化**: ユーザーがアップロードした元のファイルは直接配信しない。FunctionsがWeb表示に最適化されたサイズ（例:画像幅1600px、動画720p）に圧縮したものを生成し、`deliver/`配下に配置する。これにより、ストレージ容量と通信データ量の両方を大幅に削減する。
