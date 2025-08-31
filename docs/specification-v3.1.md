想い出リンクCMS 仕様書 v3.1
0. 概要

目的：ユーザーが写真/動画/音声/テキストで「想い出ページ」を作り、NFC/QRからスマホ最適UIで閲覧可能にする。

課金モデル：買い切り（非サブスク）。静的配信＋キャッシュでランニング最小。

技術：Firebase（Hosting / Auth / Firestore / Storage / Functions / App Check）、GitHub（PR＋タグ）、Vimeo（任意）。

特徴：

マルチLP対応（BtoB用途：赤ちゃん筆、ペット葬など）

メール発行型クレーム方式：ゲート通過後にワンタイムリンクをメールで送信 → クリックでmemoryが発行される

ローカルバックアップ設計（meta.json）

未投稿ユーザーをGoogle Sheetsで可視化

1. ドメイン構成

LP：https://<tenant>.example.com（テナント別に独立）

アプリ：https://app.example.com（Auth必須・編集/管理/クレーム処理）

公開：https://mem.example.com（静的配信／Auth不要）

2. 役割

一般ユーザー：ログイン後に自身のmemoryを編集・公開

管理者（role=admin）：注文管理、ゲート処理、メール再送、NFC書込管理、監査

3. ユーザーフロー（メール発行クレーム型）

Stripe決済／店舗受付／LPフォーム → claimRequests に記録

FunctionsがJWT（72h有効、1回限り）を生成しメール送信

URL例：https://app.example.com/claim?k=<JWT>

ユーザーがリンクを開きログイン → memory新規発行

ownerUid=currentUser.uid

publicPageId払い出し

エディタに遷移 → 公開 → 静的ページ生成

4. データモデル（Firestore 抜粋）
claimRequests/{requestId}
email, tenant, lpId, productType
status: "pending"|"sent"|"claimed"|"expired"|"canceled"
source: "stripe"|"storefront"|"lp-form"
sentAt?, claimedAt?, claimedByUid?, memoryId?

memories/{memoryId}
ownerUid, title, type, status
publicPageId, design, blocks[], tenant, lpId

auditLogs/{date}/{logId}
event: "gate.accepted"|"claim.sent"|"claim.used"|"claim.expired"
actor: "system"|uid
tenant, lpId, requestId?, memoryId?, emailHash, timestamp

5. Storage

編集中：users/{uid}/memories/{memoryId}/uploads/

処理済：proc/...（リサイズ/サムネイル）

公開：deliver/publicPages/{pageId}/...（immutableキャッシュ）

6. セキュリティルール（要点）

claimRequests / claimLinks → 管理者/Functionsのみ

memories / assets → owner または admin

publicPages → 読取は誰でも、書込はFunctionsのみ

Storage：users/... は本人のみ、deliver/... は誰でも読取可

7. Functions

画像最適化（onFinalize → sharpで生成／30日後に原本削除）

公開ビルド（POST /api/publish-page）

ゲート処理

Stripe webhook → claimRequests 作成

店舗フォーム / LPフォーム → claimRequests 作成

メール送信ジョブ → JWT生成＆送信（status=sent）

クレーム処理（GET /claim）

JWT検証／email一致確認 → memory発行／ownerUid割当 → status=claimed

再送・期限切れ処理（Schedulerでexpire、管理UIから再送可能）

Sheets連携：未投稿ユーザーリストを同期

8. キャッシュ/コスト

Firestore読取ゼロの静的配信

deliver配下は1年キャッシュ（immutable）

動画は短尺推奨、長尺はVimeo非公開埋め込み

9. ローカル保存規約

memoryごとにフォルダ＋meta.json

相対パス／ハッシュを記録し、復元可能にする

_manifests/と_indexes/で全体索引を保持

10. 運用・監査

App Check 有効化

監査ログで全イベント追跡

CI/CD：PRごとにLint/Build/Rulesテスト＋Hostingプレビュー

mainマージ時のみ本番デプロイ、タグ管理

11. UI/UX注意点

LPごとに分離。異なるLPのmemoryは絶対に混ざらない

NFC書込は「読み取り→確認→書込」の3ステップで誤書込防止

未投稿ユーザーへ自動リマインド

TODO.md（Cursor向け初手タスク）
# TODO（v3.1 初期タスク）

## A. ゲート→メール送信
- [ ] Firestore: `claimRequests/{requestId}` を追加（仕様どおりフィールド定義）。
- [ ] Functions:
  - [ ] `POST /api/gate/lp-form`（reCAPTCHA検証→claimRequests作成→送信ジョブ）
  - [ ] メール送信ジョブ（JWT生成 exp=72h、SendGrid送信、status=sent）
- [ ] 監査ログ：`gate.accepted` / `claim.sent` を記録。

## B. クレーム処理
- [ ] `GET /claim`：ログイン後にJWT検証→email一致→memory発行→ownerUid割当→claimRequests更新（claimed）
- [ ] 監査ログ：`claim.used` を記録。

## C. ルール・環境
- [ ] Firestore rules：`claimRequests` は admin/Functions のみアクセス可。
- [ ] `.env.local` に `JWT_SECRET` / `SENDGRID_API_KEY` / `RECAPTCHA_SECRET` を追加。


✅ これで「メール発行型クレーム方式」を統合した正式版を v3.1 として整理しました。
Cursorに渡すなら、この spec.md と TODO.md のセットがベストです。