# emolink CMS側実装指示書 v2.0

## 🎯 プロジェクト概要

**emolink** のCMS側を実装してください。LP側は既に完成済み（https://emolink.cloud）で、Firebase Authによるパスワードレス認証でユーザーがCMSにリダイレクトされる仕組みが整っています。

## 📊 現在の実装状況

### ✅ 完成済み（LP側）
- **申し込みフォーム**: メール送信機能
- **ログイン機能**: Firebase Auth パスワードレス認証
- **データ保存**: Firestoreへのユーザーデータ保存
- **セキュリティ**: reCAPTCHA v3、CORS、監査ログ
- **ブランディング**: "emolink" として統一

### ❌ 未実装（CMS側）
- **ユーザー管理**: 認証済みユーザーの表示・管理
- **想い出ページ作成**: タイトル、画像、動画、メッセージ
- **画像・動画アップロード**: Firebase Storage
- **NFCタグ管理**: タグ生成・割り当て・QRコード
- **制作管理**: 制作指示書、進捗、配送
- **テナント管理**: テナント情報の管理・設定（重要）

## 🏗️ 技術仕様

### 技術スタック
- **フロントエンド**: React/Vue.js（推奨）
- **バックエンド**: Firebase Functions（既存）
- **認証**: Firebase Auth（パスワードレス認証）
- **データベース**: Firestore
- **ストレージ**: Firebase Storage
- **ホスティング**: Firebase Hosting

### 環境設定
- **プロジェクト**: memorylink-cms
- **リージョン**: asia-northeast1
- **ドメイン**: https://emolink.net
- **API エンドポイント**: https://asia-northeast1-memorylink-cms.cloudfunctions.net/api

## 📋 実装フェーズ

### Phase 1: 基本機能（最優先）

#### 1.1 ユーザー管理画面
```javascript
// 要件
- Firebase Authでログイン済みユーザーのみアクセス可能
- Firestoreのusersコレクションから認証済みユーザーを表示
- ユーザー一覧（email, status, createdAt）
- ユーザー詳細表示
- ステータス管理（pending → verified → processing → shipped）

// 実装順序
1. 認証チェック機能
2. ユーザー一覧取得・表示
3. ユーザー詳細画面
4. ステータス更新機能

// 参考データ
- API: https://asia-northeast1-memorylink-cms.cloudfunctions.net/api
- ユーザー例: {email: "test@example.com", status: "verified", tenant: "petmem"}
```

#### 1.2 想い出ページ作成
```javascript
// 要件
- 認証済みユーザーが自分の想い出ページを作成可能
- タイトル、説明文の入力
- 画像・動画のアップロード（Firebase Storage）
- メッセージの追加・編集
- プレビュー機能
- 公開・非公開の切り替え

// データ構造
memoryPages: {
  userId: string,
  title: string,
  description: string,
  photos: string[],
  videos: string[],
  messages: string[],
  status: "draft" | "published" | "shipped",
  createdAt: timestamp,
  updatedAt: timestamp
}

// 実装順序
1. ページ作成フォーム
2. 画像・動画アップロード機能
3. プレビュー機能
4. 保存・更新機能
```

### Phase 2: 高度機能

#### 2.1 NFCタグ管理
```javascript
// 要件
- 想い出ページとNFCタグの紐付け
- NFCタグIDの生成・管理
- QRコードの生成・表示
- 配送管理（タグの割り当て・発送）

// データ構造
nfcTags: {
  nfcId: string,
  memoryPageId: string,
  userId: string,
  qrCode: string,
  status: "available" | "assigned" | "shipped",
  assignedAt: timestamp,
  shippedAt: timestamp
}

// 実装順序
1. NFCタグ生成機能
2. 想い出ページとの紐付け
3. QRコード生成・表示
4. 配送管理画面
```

#### 2.2 制作管理
```javascript
// 要件
- 注文管理（orders）
- 制作指示書作成
- 進捗管理
- 配送管理

// データ構造
orders: {
  orderId: string,
  userId: string,
  memoryPageId: string,
  productType: "acrylic",
  status: "pending" | "processing" | "shipped" | "delivered",
  nfcTagId: string,
  shippingAddress: object,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 2.3 テナント管理（重要）
```javascript
// 要件
- テナント情報の表示・管理
- テナント設定の編集
- 新規テナントの作成
- テナント別データの管理
- テナント別LP設定の管理

// データ構造
tenants: {
  tenantId: string,
  name: string,
  description?: string,
  allowedLpIds: string[],
  enabledProductTypes: string[],
  settings: {
    maxClaimRequestsPerHour: number,
    emailTemplate: string,
    branding: {
      logo?: string,
      colors: string[],
      theme: string
    },
    fulfillmentMode: "tenantDirect" | "vendorDirect"
  },
  status: "active" | "inactive" | "suspended",
  createdAt: timestamp,
  updatedAt: timestamp
}

// 実装順序
1. テナント一覧表示
2. テナント詳細表示
3. テナント設定編集
4. 新規テナント作成
5. テナント別データ管理
```

### Phase 3: 自動化・分析

#### 3.1 通知システム
```javascript
// 要件
- 新規ユーザー通知
- 制作完了通知
- 配送通知
- 支払い通知

// 実装
- メール通知（Nodemailer）
- プッシュ通知（Firebase Cloud Messaging）
- ステータス更新通知
```

#### 3.2 分析機能
```javascript
// 要件
- ユーザー分析
- 売上分析
- 制作効率分析

// 実装
- Firestore Analytics
- Google Analytics 連携
- ダッシュボード表示
```

## 🔧 技術的詳細

### テナント情報の共有状況（重要）
```javascript
// 現在の実装状況
LP側: {
  tenant: "petmem",           // ハードコード
  lpId: "direct"              // ハードコード
}

Functions側: {
  TENANT_CONFIG: {            // ハードコード
    petmem: {
      allowedLpIds: ["direct", "partner1", "partner2"],
      enabledProductTypes: ["acrylic", "digital", "premium"]
    }
  }
}

CMS側: {
  テナント管理: "未実装",      // 実装が必要
  動的設定: "未実装"          // 実装が必要
}

// 改善後の実装
Firestore: {
  tenants/{tenantId}: {       // 動的データ
    id: "petmem",
    name: "PetMemory Inc.",
    allowedLpIds: ["direct", "partner1"],
    settings: { ... }
  }
}

CMS側: {
  テナント管理: "実装済み",    // 管理画面
  動的設定: "実装済み"        // 設定変更可能
}
```

### Firebase設定
```javascript
// 既存設定
- プロジェクト: memorylink-cms
- リージョン: asia-northeast1
- 認証: メールリンク認証有効
- CORS: 許可ドメイン設定済み
- Firestoreルール: 設定済み
- Storageルール: 設定済み
```

### セキュリティ要件
```javascript
// 必須実装
- CORS設定（許可されたドメインのみ）
- reCAPTCHA v3検証
- Rate Limiting（過度なリクエスト制限）
- Audit Logging（全てのアクションを記録）
- ユーザー認証チェック（全ページ）
```

### データフロー
```javascript
// 完全なフロー
1. ユーザーアクション
   ユーザー → LPフォーム入力 → メール送信

2. バックエンド処理（Firebase Functions）
   メール受信 → reCAPTCHA検証 → データ保存 → 認証メール送信

3. ユーザー認証
   認証メール受信 → リンククリック → 認証完了 → CMSリダイレクト

4. CMS側処理
   CMSログイン → ユーザー情報表示 → 想い出ページ作成 → 画像アップロード → 公開

5. 物理商品の制作
   CMSデータ → 制作指示 → アクリルスタンド制作 → NFCタグ設定 → 配送
```

## 📊 データ構造詳細

### 既存コレクション
```javascript
// users/{uid}
{
  email: string,
  displayName?: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  status: "pending" | "verified" | "processing" | "shipped"
}

// claimRequests/{requestId}
{
  email: string,
  tenant: string,
  lpId: string,
  productType: string,
  status: "pending" | "sent" | "claimed" | "expired",
  sentAt?: timestamp,
  claimedAt?: timestamp
}
```

### 新規作成コレクション
```javascript
// memories/{memoryId}
{
  ownerUid: string,
  tenant: string,
  lpId: string,
  title: string,
  description: string,
  type: "acrylic",
  status: "draft" | "published" | "shipped",
  publicPageId: string,
  design: {
    theme: string,
    fontScale: number
  },
  blocks: array,
  createdAt: timestamp,
  updatedAt: timestamp
}

// assets/{assetId}
{
  memoryId: string,
  ownerUid: string,
  type: "image" | "video" | "audio",
  storagePath: string,
  url: string,
  thumbnailUrl?: string,
  size: number,
  createdAt: timestamp
}

// publicPages/{pageId}
{
  tenant: string,
  memoryId: string,
  title: string,
  about?: string,
  design: object,
  media: object,
  ordering: array,
  publish: {
    status: "draft" | "published",
    version: number,
    publishedAt: timestamp
  },
  access: {
    mode: "public" | "private"
  },
  createdAt: timestamp
}

// orders/{orderId}
{
  tenant: string,
  lpId: string,
  orderRef: string,
  ownerUid?: string,
  memoryId?: string,
  publicPageId?: string,
  productType: "acrylic",
  fulfillmentMode: "tenantDirect" | "vendorDirect",
  status: "pending" | "processing" | "shipped" | "delivered",
  print: {
    qrPrinted: boolean
  },
  nfc: {
    written: boolean,
    pageUrl: string,
    device: string,
    operator: string,
    prevUrl?: string,
    writtenAt?: timestamp
  },
  shipping: {
    packed: boolean,
    shippedAt?: timestamp,
    trackingNo?: string,
    address?: object
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 🎯 実装優先順位

### 最優先（Phase 1）
1. **ユーザー管理画面** - 認証済みユーザーの表示・管理
2. **想い出ページ作成** - 基本情報入力・画像アップロード
3. **プレビュー機能** - 作成したページの確認

### 中優先（Phase 2）
1. **NFCタグ管理** - タグ生成・割り当て
2. **QRコード生成** - 表示・印刷
3. **制作管理** - 注文・進捗管理
4. **テナント管理** - テナント情報・設定管理（重要）

### 低優先（Phase 3）
1. **通知システム** - 自動通知
2. **分析機能** - ダッシュボード
3. **高度なUI** - アニメーション・レスポンシブ

## 🔍 受け入れ条件

### Phase 1完了条件
- [ ] ユーザー一覧が表示される
- [ ] 認証チェックが機能する
- [ ] 想い出ページが作成できる
- [ ] 画像アップロードが機能する
- [ ] プレビューが表示される

### Phase 2完了条件
- [ ] NFCタグが生成・割り当てできる
- [ ] QRコードが生成・表示される
- [ ] 制作管理ができる
- [ ] 配送管理ができる
- [ ] テナント情報が管理できる
- [ ] 新規テナントが作成できる

### Phase 3完了条件
- [ ] 通知が自動送信される
- [ ] 分析ダッシュボードが表示される
- [ ] 全ての機能が統合されている

## 🚀 次のステップ

1. **Phase 1から開始**: ユーザー管理画面の実装
2. **段階的実装**: 各フェーズごとにテスト・確認
3. **統合テスト**: 全機能の連携確認
4. **本番デプロイ**: 段階的なリリース

## ⚠️ 重要な注意事項

### テナント情報の整合性
- **現在**: LP側とFunctions側でテナント情報がハードコードされている
- **問題**: 新規テナント追加時にコード変更が必要
- **解決**: CMS側でテナント管理機能を実装し、動的に管理可能にする
- **優先度**: Phase 2で必ず実装（データ整合性のため）

### データ分離の重要性
- **マルチテナント**: 各テナントのデータを完全に分離
- **セキュリティ**: テナント間でのデータ漏洩を防ぐ
- **スケーラビリティ**: 新規テナントの追加を容易にする

---

**この指示書に従って実装を進めてください。各フェーズが完了したら、次のフェーズに進む前に必ずテスト・確認を行ってください。**

