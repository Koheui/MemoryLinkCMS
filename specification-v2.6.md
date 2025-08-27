想い出リンクCMS 仕様書 v2.6 詳細版（VSCode / Gemini 向け）
0. 概要

想い出リンクCMSは、購入者が「筆（赤ちゃん筆）」「ペット関連商品」などの物理商品を買った際に、NFCやQRからアクセスできる専用の想い出ページを作るサービスです。
ユーザーは写真・動画・音声・テキストをアップロードし、専用ページとして公開できます。

販売モデル：BtoB（メーカーや葬儀社などが商品と一緒に提供）

課金：買い切り（非サブスク）

技術スタック：Firebase（Auth / Firestore / Storage / Hosting / Functions / App Check）

1. 重要な概念

秘密鍵（Claim Key）

購入者だけが受け取る一度限りのコード

サインアップ時に入力することで「購入証明」になる

一度使うと無効化され、他人は使えない

UID

Firebase Authが自動生成する内部のユーザーID

秘密鍵とは別物（外部に出さない）

memory

1つの想い出ページの単位

秘密鍵1つにつき1つのmemoryが発行される

tenant

LP（ランディングページ）ごとの区切り

例：赤ちゃん筆なら tenant="babyhair"、ペット葬儀なら tenant="pet"

テナントをまたいでmemoryを表示してはいけない（クロス表示禁止）

2. ユーザー体験フロー
一般ユーザー

商品購入 → NFC/QR からLPにアクセス

秘密鍵を入力（/claim ページ）

アカウントを新規作成 or ログイン（既存ユーザー）

成功すると 新しいmemoryが自分のアカウントに追加される

子供3人 → 秘密鍵を3回入力 → memoryが3つ並ぶ

ダッシュボードで編集し、「公開」を押すと静的ページが生成される

管理者（社内）

注文（顧客）を登録

秘密鍵を1000件などまとめて発行（バッチ）

NFCタグに正しいURLを書き込み、スマホで検証

出荷管理（検証済みでないと発送できない）

未アップロード顧客はGoogleスプレッドシートに毎日出力 → 営業リストに活用

3. データモデル（Firestore 抜粋）
keys/{keyId}
{
  "tenant": "babyhair",
  "batchId": "batch-20250828-001",
  "status": "unused",  // → claimedになる
  "productType": "brush",
  "secretHash": "...",  // 平文は保存しない
  "memoryId": null,
  "createdAt": "...",
  "updatedAt": "..."
}

memories/{memoryId}
{
  "tenant": "babyhair",
  "ownerUid": "abc123",
  "title": "初めての筆",
  "status": "draft",
  "coverAssetId": null,
  "createdAt": "...",
  "updatedAt": "..."
}

orders/{orderId}
{
  "email": "user@example.com",
  "memoryId": "mid123",
  "tenant": "babyhair",
  "status": "paid",
  "shipping": { "nfcWritten": true },
  "createdAt": "...",
  "updatedAt": "..."
}

4. 秘密鍵ポリシー

サインアップ時のみ使用可能

/claim ページ以外では入力不可

1鍵 = 1memory

使用後は claimed になり再利用不可

同じUIDで複数memoryはOK（兄弟・複数ペット対応）

テナント分離必須

babyhair LPでログインしても pet のmemoryは絶対に見せない

5. NFC / QR 書込運用

NFC/QRには必ず /claim?k=<秘密鍵> を書き込む

memory直リンクは禁止（セキュリティのため）

管理画面から「注文を選択 → NFC書込 → スマホで検証」

検証しないと orders.shipping.nfcWritten=true にできない

6. Functions 実装概要
/api/keys/batch-create（管理者専用）

入力：tenant, count

出力：CSV（displayCode, claimUrl）

Firestoreに keys/{keyId} を1000件追加

平文はCSVにのみ含める（DBにはハッシュのみ保存）

/api/claim-key

入力：秘密鍵

処理：

秘密鍵を正規化・ハッシュ化して検索

未使用なら新しい memory を作成

keys.status="claimed" に更新

返却：memoryId

エラー条件：形式不正、テナント不一致、既にclaimed

/api/publish-page

memories/{id} を読み込み → 静的HTML+manifest.jsonを生成

deliver/publicPages/{pageId}/ に出力

画像最適化

onFinalize: uploads/* 検知 → sharpで圧縮版とサムネイルを生成

7. Google Sheets 連携（未アップロード顧客管理）

Cloud Scheduler（毎日AM2:00）で起動

条件：ownerUid != null && (coverAssetId==null || assets=0)

出力項目：email, memoryId, orderId, tenant, status, lastUpdatedAt

Sheets APIで上書き更新

スプレッドシート側で条件付き書式：

draft=赤

30日放置=黄

8. UIポリシー

ダッシュボードには 同じテナント内のmemoryのみ表示

複数memoryがある場合は並べて表示（兄弟3人対応）

違うテナントのmemoryは絶対に見せない

9. 運用・監査

App Check 有効化

主要イベントを auditLogs に保存（鍵クレーム、NFC書込、公開）

規約に「原本は30日保持、その後削除」と明記

10. 開発者への注意点（Geminiへの指示）

「秘密鍵＝サインアップ専用」のポリシーを絶対に守る

NFC/QRには 必ず /claim URL を書き込む（memory直リンクは書かない）

ダッシュボードは tenant単位でフィルタすること

Google Sheets連携は必須（未アップロード顧客確認用）

アルバイトスタッフでも安全に書込できるUI（検証ステップ必須）を設計