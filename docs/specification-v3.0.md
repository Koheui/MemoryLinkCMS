想い出リンクCMS 仕様書 v3.0（Cursor対応・統合版）
0. 概要

目的

写真 / 動画 / 音声 / テキストを組み合わせた「想い出ページ」を作成。

NFCタグやQRコードをハードに貼り付け、スマホから認証・閲覧可能にする。

買い切り（非サブスク）モデルで提供。

技術スタック

Firebase（Hosting / Auth / Firestore / Storage / Functions / App Check）

GitHub でコードを管理（PRフロー＋main保護＋タグ管理）。

Cursor を用いた自動編集。

特徴

マルチLP対応（赤ちゃん筆、ペット葬など BtoB展開でLPは別々）

秘密鍵（claim key）方式でユーザーが正規購入者であることを保証

未投稿ユーザーの可視化（Google Sheets連携）

ローカル保存／バックアップ（動画は特にリスク対策として）

1. ドメイン構成

LP： https://<partner>.example.com

BtoBごとに異なるLP。ユーザーはここからサインアップ。

「同じユーザーが複数のLPに入っても、互いのmemoryを見せない」仕組みを実装。

アプリ（編集/管理）： https://app.example.com

認証必須。一般ユーザーはビジュアルエディタ、管理者は注文/NFC書込/進捗管理。

公開（NFC/QR用）： https://mem.example.com

静的配信（deliver配下）。Auth不要。

2. ユーザー体験フロー
管理者

注文作成 → 顧客メールと製品タイプ登録。

memoryId 発行。対応する**秘密鍵（claim key）**も生成。

公開URL（/p/{pageId}）をNFC/QRに書き込み、製品に貼付。

進捗（paid/shipped/delivered）を更新。

一般ユーザー

招待メール or LPからサインアップ。

初回ログイン時に秘密鍵を入力 → memory に ownerUid を割当。

ページ編集（カバー/プロフィール/ブロック）。

「公開」ボタン → Functions が静的ファイルを生成し deliver に配置。

3. データモデル（Firestore）
users/{uid}

email, displayName, createdAt, updatedAt

claimKeys/{keyId}（秘密鍵管理）

memoryId

issuedToEmail

status: "unused" | "claimed"

claimedByUid（最初にサインアップしたユーザーID）

createdAt, updatedAt

memories/{memoryId}

ownerUid: string | null

title, type("pet"|"birth"|"memorial"|"other"), status

publicPageId, coverAssetId, profileAssetId

design: { theme, colors, fontFamily, … }

blocks: album / video / audio / text 配列

createdAt, updatedAt

assets/{assetId}

memoryId, ownerUid, type("image"|"video"|"audio")

storagePath, url, thumbnailUrl

size, createdAt, updatedAt

publicPages/{pageId}

memoryId, title, about, design

media（cover/profile）

ordering, publish.status/version/publishedAt

access: { mode: "open"|"passcode"|"linkToken", … }

createdAt, updatedAt

publicPages/{pageId}/blocks/{blockId}

type, order, visibility

各blockに応じた詳細

seasons（拡張：季節カード）

memories/{memoryId}/seasons/{seasonId}

auditLogs/{yyyyMMdd}/{logId}

event: "invite"|"claim"|"publish"|"delete"

actorUid, targetMemoryId, metadata

4. Storage 構造

編集中： users/{uid}/memories/{memoryId}/uploads/

処理済み： proc/users/... （リサイズ・サムネイル）

公開用： deliver/publicPages/{pageId}/...

5. セキュリティルール（要点）
Firestore

users → owner or admin

claimKeys → write/read: adminのみ。初回claim時のみユーザーが更新可

memories → owner or admin

publicPages → 読み取りは全員可、書込みはFunctionsのみ

Storage

users/... → ownerのみ（サイズ制限あり）

proc/... → Functionsのみ

deliver/... → 全員read可（immutable配信）

6. Functions（TS）

画像最適化（onFinalize → sharpでw1600/400）

公開ビルド（/api/publish-page）

memoriesを読み込む

procからdeliverにコピー

manifest.json生成

version++

秘密鍵のclaim処理

初回サインアップ時に claimKey 検証

ownerUid を割り当てる

claimedByUid を更新

Google Sheets連携（未投稿ユーザー可視化）

Functionsで /exports/usersWithoutContent 実行 → Sheetsに同期

ローカル保存エクスポート

deliver配下をZIP化して管理者がダウンロード

動画原本は30日後削除。ただしローカルHDDにバックアップ可

7. キャッシュ / コスト削減

deliver配下は immutable（1年キャッシュ）

Firestore読取ゼロ、静的配信のみ

長尺動画はVimeo非公開埋め込み可（保険として原本ローカル保存）

8. 運用

mainにマージされた時のみデプロイ（CI/CD）

mainにタグ（v1.1, v1.2…）を打ってバージョン管理

App Check 有効化（本番）

ログは auditLogs に保存

LPはBtoBごとに別、同じユーザーでもLPごとに分離

9. 注意点

同じ母親が子供3人分購入しても、同じLPからのmemoryは見えてOK。

別LPからのmemoryは絶対に混ざらないよう制御。

NFC書込時に memoryIdとの一致確認を強制。アルバイトでもミスできないフローを用意。