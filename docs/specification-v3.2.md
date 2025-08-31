想い出リンクCMS 仕様書 v3.2

（管理者・コンソール設定 追記版）

0. 概要

ユーザー：NFC/QRでアクセスできる「想い出ページ」を作成・公開。

管理者：注文管理、招待、進捗管理、NFC書込、印刷/出荷のフローを制御。

技術：Firebase（Auth / Firestore / Storage / Hosting / Functions / App Check）、Electron+ACR122U（専用NFC書込アプリ）。

1. 管理者仕様（Roles & Claims）
1.1 権限ロール

superAdmin

全テナントの参照・操作可

tenant昇格、NFC初期化など特権操作

tenantAdmin

自テナントのみ操作可（印刷/NFC書込/出荷）

Custom Claimsに adminTenant: "<tenantId>" を必須付与

fulfillmentOperator（任意）

出荷系操作専用（印刷/NFC/梱包/発送のみ）

1.2 Custom Claims 設定例
{
  "role": "tenantAdmin",
  "adminTenant": "babyhair"
}

2. Firebase コンソール設定
2.1 Firebase Auth

サインイン方法 → Emailリンク（パスワードレス） を有効化

continueUrl：https://app.example.com/claim

承認済みドメイン：

app.example.com（必須）

mem.example.com（任意）

メールテンプレ：ブランド名・差出人を設定

2.2 Firestore

ルール：

orders/claimRequests は Functions 経由のみ更新

memories/assets は owner または admin

publicPages は read-only

インデックス：

(tenant, status, updatedAt desc)

(tenant, lpId, status, updatedAt desc)

(tenant, updatedAt desc)

2.3 Storage

/deliver/** → read: true, write: false（Functionsのみ）

/users/** → ownerのみ書込可（画像/動画/音声のみ、サイズ制限あり）

2.4 Hosting

マルチサイト構成：lp.example.com / app.example.com / mem.example.com

mem の /deliver/** は immutable, max-age=31536000

app は SPA リライト

2.5 Functions 環境変数

FIREBASE_WEB_API_KEY

RECAPTCHA_SECRET

APP_CLAIM_CONTINUE_URL=https://app.example.com/claim

CORS_ALLOWED_ORIGINS=https://tenant-a.co.jp,https://tenant-b.jp

任意：STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SHEETS_SERVICE_ACCOUNT

2.6 App Check

Auth/Firestore/Functions/Storage に適用

Electron（専用アプリ）は除外可能

3. 管理者アカウント作成フロー
3.1 管理者昇格スクリプト（Node.js/Admin SDK）
import * as admin from 'firebase-admin';
admin.initializeApp();

async function setClaims(email: string, role: string, tenant?: string) {
  const user = await admin.auth().getUserByEmail(email);
  const claims: any = { role };
  if (role === "tenantAdmin") claims.adminTenant = tenant;
  await admin.auth().setCustomUserClaims(user.uid, claims);
  console.log("set claims for", email, claims);
}

setClaims("staff@tenant.co.jp", "tenantAdmin", "babyhair");

3.2 管理UI経由（安全版）

POST /api/admin/users/set-claims を superAdmin のみ許可

成功時は auditLogs に記録（admin.user.claimsUpdated）

4. 管理UIの表示制御
import { getAuth } from "firebase/auth";
const token = await auth.currentUser.getIdTokenResult(true);
const role = token.claims.role;
const tenant = token.claims.adminTenant;


role によってメニュー制御

tenant で Firestoreクエリをフィルタ

5. 受け入れテスト（管理者系）

 superAdmin で全テナント参照可

 tenantAdmin は自テナントだけ見える

 orders.nfc などの工程更新は Functions 経由でのみ可能

 /claim の認証はメール＆JWTで突合（email / tenant / lpId / requestId）

 CORS 設定外のフォーム送信はブロック

 auditLogs に管理操作が残る

👉 この v3.2 では「管理者の仕様」と「Firebaseコンソール設定」が一目でわかるよう整理しました。