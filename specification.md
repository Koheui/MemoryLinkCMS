想い出リンクCMS 仕様書（最終版 / Firebase Studio向け）
0. 概要と前提

目的：ユーザーが写真/動画/音声/テキストで「想い出ページ」を作り、**スマホ最適UIの公開ページ（個別URL）**をNFCタグから閲覧できるようにする。

課金：買い切り（非サブスク）。ランニングは静的配信＋強キャッシュで最小化。

技術：Firebaseのみ（Hosting / Auth / Firestore / Storage / Functions）。

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
  description: string
  design: { theme, fontScale, ... }
  blocks: [ { blockId, type, order, ... } ]
  createdAt, updatedAt

assets/{assetId}
  ownerUid: string
  memoryId: string | null
  name: string
  type: "image" | "video" | "audio"
  storagePath: string
  url: string
  size: number
  createdAt, updatedAt

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

2.2 Storage
# ユーザーがアップロードする元ファイル
users/{uid}/library/assets/{assetId}_{filename}
users/{uid}/memories/{memoryId}/assets/{assetId}_{filename}

# 動画から生成されたサムネイル
users/{uid}/library/thumbnails/{assetId}_thumb.jpg
users/{uid}/memories/{memoryId}/assets/thumbnails/{assetId}_thumb.jpg

3. セキュリティルール
**（注：このドキュメントではなく、プロジェクトルートにある `firestore.rules` および `storage.rules` ファイルがデプロイの正となります）**

3.1 Firestore
```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }
    function isAdmin() { return isSignedIn() && request.auth.token.role == 'admin'; }

    match /users/{uid} {
      allow read, write: if isOwner(uid) || isAdmin();
    }

    match /memories/{memoryId} {
      allow read: if resource.data.ownerUid == null || isOwner(resource.data.ownerUid) || isAdmin();
      allow write: if isOwner(request.resource.data.ownerUid) || isAdmin();
    }

    match /assets/{assetId} {
       allow create, update, delete: if isOwner(request.resource.data.ownerUid) || isAdmin();
       allow read: if isOwner(resource.data.ownerUid) || isAdmin();
    }

    match /orders/{orderId} {
      allow read, write: if isAdmin();
    }
  }
}
```

3.2 Storage
```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {

    function isSignedIn() { return request.auth != null; }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }

    // ユーザーは自分のUID配下のパスにのみ書き込める
    match /users/{uid}/{allPaths=**} {
      allow read, write: if isOwner(uid);
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

*   `/p/{pageId}`：Firestoreから動的にデータを読み込んで表示

6. Functions 概要
6.1 ビデオサムネイル生成（onObjectFinalized）

*   トリガ：`users/{uid}/.../assets/*.mp4`など動画ファイルのアップロード
*   処理：ffmpegを使い、動画から複数のサムネイル画像を生成
*   出力：元の動画と同じ階層の`thumbnails/`ディレクトリに保存し、`assets`ドキュメントにURLを記録

7. キャッシュ戦略とコスト削減
本システムは、公開ページをサーバーサイドでレンダリングしたり、静的ビルドしたりするのではなく、クライアント（ブラウザ）が直接Firestoreからデータを読み込んで表示するアーキテクチャを採用しています。これにより、以下のメリットがあります。

*   **リアルタイム更新**: ユーザーが編集・保存した内容が、ビルドプロセスを待たずに即座に公開ページに反映されます。
*   **低コスト運用**: 静的ファイルをホスティングするためのストレージコストや、ビルド処理のためのFunctions実行コストが不要です。Firestoreの読み取りコストは発生しますが、ドキュメントサイズが小さく、リスナー（onSnapshot）を適切に管理すれば、大規模なアクセスがない限りは非常に低コストで運用できます。
*   **シンプルな構成**: ビルドパイプラインが不要なため、開発・運用がシンプルになります。

Firestoreのセキュリティルールにより、未公開のデータや他人のデータへのアクセスは固く禁じられているため、この構成でも安全性は確保されています。
