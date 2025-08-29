# TODO（想い出リンクCMS v3.0）

## 最優先タスク（認証まわり）
- [ ] Firebase Auth の Email/Password 認証を有効化する（Console側設定は済んでいる前提）。
- [ ] `.env.local` に以下を必須とする：
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `src/lib/firebase/client.ts` に Firebase 初期化処理を追加：
  - `initializeApp` / `getAuth` を用いたシングルトン構成
  - 既存の getApps / getApp を活用して多重初期化を防ぐ

## 二次タスク（claim key 基盤）
- [ ] Firestore に `claimKeys/{keyId}` コレクションを追加する。
- [ ] フィールド定義：
  - `memoryId`
  - `issuedToEmail`
  - `status` ("unused"|"claimed")
  - `claimedByUid`
  - `createdAt`, `updatedAt`
- [ ] 初回サインアップ時に claim key を入力し、Firestore ルールで ownerUid を割り当てる処理を追加。

## 三次タスク（運用補助）
- [ ] `auditLogs/{yyyyMMdd}/{logId}` を追加して、招待/claim/publish など主要イベントを記録。
- [ ] Google Sheets 連携のための Functions 雛形を用意（未投稿ユーザー可視化用）。
