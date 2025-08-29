# TODO（v3.1 統合版：Firebase Auth メールリンク方式）

## 優先A：ゲート成立 → メールリンク送信（SendGrid/JWTは使わない）
- [ ] Firestore: `claimRequests/{requestId}` を作成（必須: email, tenant, lpId, productType, source, status="pending", generatedAt）。
- [ ] Endpoints（Functions）：
  - [ ] `POST /api/gate/lp-form`：reCAPTCHA検証 → `claimRequests` 追加 → メールリンク送信 → status="sent"
  - [ ] `POST /api/gate/storefront`：店舗JWT検証 → `claimRequests` 追加 → メールリンク送信 → status="sent"
  - [ ] `POST /hooks/stripe`：署名検証 → 決済成功で `claimRequests` 追加 → メールリンク送信 → status="sent"
- [ ] **メールリンク送信**（Firebase Auth Email Link / Action Code）：
  - [ ] `ActionCodeSettings.url = https://app.example.com/claim?rid=<requestId>&tenant=<...>&lpId=<...>`
  - [ ] iOS/Androidパラメータは後追い（必要なら）
  - [ ] 監査ログ：`gate.accepted` / `claim.sent`

## 優先B：受け取り処理（/claim）
- [ ] フロント：`isSignInWithEmailLink(location.href)` → 未サインインなら `signInWithEmailLink(email, location.href)` 実行UI
- [ ] サインイン後、`auth.currentUser.email` と `claimRequests/{rid}.email` を**厳密一致**で突合（正規化：小文字化・必要に応じ+タグ除去）
- [ ] OKなら：
  - [ ] `memories` 新規作成（tenant/lpId, productType テンプレ反映）
  - [ ] `ownerUid = auth.uid`, `publicPageId` 付与、`status=active`
  - [ ] `claimRequests.status="claimed"`, `claimedByUid`, `claimedAt`
  - [ ] 監査ログ：`claim.used`
- [ ] 期限切れ/既使用/不一致時のUI分岐：
  - [ ] 有効期限切れ：再送申請導線
  - [ ] 既使用：エラー表示（管理UI経由で再送可能）
  - [ ] メール不一致：宛先変更フォームへの導線（下記C）

## 優先C：宛先変更・再送（未クレーム時）
- [ ] `POST /api/claim/change-email`（reCAPTCHA・レート制限 例: 24h/1回）：
  - 入力: { requestId, newEmail }
  - `claimRequests.email` を**保留更新**（emailHistory へ追記）
  - 新しい **メールリンク** を送信（旧リンクは自然失効）
  - 監査ログ：`claim.emailChanged` / `claim.resent`
- [ ] バウンス検知（任意）：メールプロバイダWebhookで配送不能 → statusを`pending`へ戻し、管理UIに通知

## 優先D：セキュリティ/健全化
- [ ] Firestore Rules：
  - `claimRequests` は **admin/Functions のみ**（クライアント不可）
  - `memories` / `assets` は **owner(uid) or admin**
  - `publicPages` は **read: true / write: Functionsのみ**
- [ ] 検証：
  - Stripe署名検証（/hooks/stripe）
  - reCAPTCHA検証（lp-form / change-email）
  - 店舗JWT検証（storefront）
- [ ] レート制限（Functionsで enforce）：
  - 同一emailへの新規送信は 1h 1回（`claimRequests` と監査から判定）
- [ ] App Check：本番で有効化（Auth/Firestore/Storage）

## 優先E：管理UI
- [ ] `claimRequests` 一覧（status, source, tenant/lpId フィルタ）
- [ ] 「再送」ボタン（メールリンクを再送）
- [ ] 監査ビュー（gate.accepted / claim.sent / claim.used / claim.expired / claim.emailChanged / claim.resent）

## 優先F：期限切れ処理
- [ ] Cloud Scheduler：`sentAt + 72h < now && status="sent"` → `status="expired"` に更新
- [ ] `/claim` で expired を検出 → 再送導線を表示

## 後追いG：未投稿ユーザーの可視化（Sheets 連携・任意）
- [ ] CRON：`claimedAt > 7d` かつ `assetsCount == 0` の `memories` を抽出
- [ ] Google Sheets へ同期（追客リスト）
- [ ] 宛先変更/再送履歴も行追加（軽いCRM用途）

## 後追いH：環境・実装ノート
- [ ] `.env.local` / Functions 環境変数：
  - `NEXT_PUBLIC_FIREBASE_*` 一式
  - `RECAPTCHA_SECRET`, `STORE_JWT_PUBLIC_KEY`（店舗用）など
- [ ] メールテンプレ（Firebase Console の Action Email テンプレートを編集）
- [ ] Email 正規化ユーティリティを共通化（小文字化・+タグ処理は要件に合わせて）
- [ ] 監査ログは `email` は保存せず `emailHash`（SHA-256等）を記録

