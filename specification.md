想い出リンクCMS 仕様書（最終版 / Firebase Studio向け）
0. 概要と前提

目的：ユーザーが写真/動画/音声/テキストで「想い出ページ」を作り、**スマホ最適UIの公開ページ（個別URL）**をNFCタグから閲覧できるようにする。

課金：買い切り（非サブスク）。ランニングは静的配信＋強キャッシュで最小化。

技術：Firebaseのみ（Hosting / Auth / Firestore / Storage / Functions）。Airtable不使用。

役割：

一般ユーザー（Email+PWでログイン）… アップロードと公開ページ編集/公開

管理者（Custom Claimsでadmin）… 顧客管理・進捗管理・NFC・審査

ドメイン構成（推奨・変更可）

LP（ランディング）：https://www.example.com（静的・説明・申込導線のみ。Auth不要）

アプリ（編集/管理/ダッシュボード）：https://app.example.com（Auth必須）

公開ページ（閲覧/NFC）：https://mem.example.com（Auth不要、静的のみ）

1. ユーザー体験フロー（UX）

LP → アカウント作成導線

LPでサービス説明→「はじめる」→アプリの/signupへ遷移

サインアップ/ログイン（Email+PW）

ユーザー登録→ログイン→初回ウィザードへ

初回ウィザード（申込み兼ねる）

「想い出（Memory）作成」→ タイトル/種別入力

写真 5–10枚アップロード（動画/音声は任意）

備考欄（自由入力）

**注文レコード（Order）**を作成し status="assets_uploaded" に

管理者オペレーション（当面手動）

原本写真→外部サービスで3D生成→候補モデルを登録

管理画面でステータスを model_ready に

ユーザー確認→モデル選択→決済

候補3Dを閲覧→選択

決済（Stripe or 請求書運用）→Webhook/手動で paid

公開ページ生成＆NFC

ユーザー（または管理者）が「公開」を実行

Functionsが静的ビルド（deliver/**＋manifest.json）

https://mem.example.com/p/{pageId} をNFCへ書込み→出荷

公開後の編集

ユーザーはカバー/プロフィール/概要、**ブロック（Album/Video/Audio/Text）**を編集→再公開ビルド

2. データモデル（Firestore / Storage）
2.1 Firestore
users/{uid}
  email, displayName?
  createdAt, updatedAt

memories/{memoryId}                 // 想い出コンテナ（1公開ページに相当）
  ownerUid: string
  title: string
  type: "pet" | "birth" | "memorial" | "other"
  status: "draft" | "active" | "archived"
  publicPageId: string | null
  coverAssetId: string | null
  profileAssetId: string | null
  createdAt, updatedAt

memories/{memoryId}/assets/{assetId}
  type: "image" | "video" | "audio"
  rawPath: string
  procPath?: string
  thumbPath?: string
  createdAt

orders/{orderId}                    // 顧客・進捗管理の中核
  userUid: string
  memoryId: string
  status: "draft" | "assets_uploaded" | "model_ready" | "selected" | "paid" | "delivered"
  note?: string
  candidateModelIds?: string[]      // Storageのmodelsパス配列（任意）
  selectedModelId?: string | null
  payment: { method?: "stripe"|"invoice", linkUrl?: string, paidAt?: Timestamp }
  shipping: { nfcWritten?: boolean, shippedAt?: Timestamp }
  createdAt, updatedAt, audit: { lastUpdatedBy?: string }

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
raw/users/{uid}/memories/{memoryId}/uploads/{fileId}.{ext}
proc/users/{uid}/memories/{memoryId}/images/{fileId}_w1600.jpg
proc/users/{uid}/memories/{memoryId}/thumbs/{fileId}_w400.jpg
proc/users/{uid}/memories/{memoryId}/video/{fileId}.mp4
proc/users/{uid}/memories/{memoryId}/audio/{fileId}.mp3
models/orders/{orderId}/{modelId}.{glb|usdz}           # 3D候補（任意）

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
function isOwner(memoryId) {
  return isSignedIn() &&
         get(/databases/$(database)/documents/memories/$(memoryId)).data.ownerUid == request.auth.uid;
}

service cloud.firestore {
  match /databases/{database}/documents {

    // 自分のユーザードキュメントのみ
    match /users/{uid} {
      allow read, write: if (isSignedIn() && request.auth.uid == uid) || isAdmin();
    }

    // 想い出本体
    match /memories/{memoryId} {
      allow read, write: if isOwner(memoryId) || isAdmin();
    }

    // 資産メタ（想い出配下）
    match /memories/{memoryId}/assets/{assetId} {
      allow read, write: if isOwner(memoryId) || isAdmin();
    }

    // 顧客/進捗（管理者主体、本人は自分のorderをread可にしても良い）
    match /orders/{orderId} {
      allow read, write: if isAdmin();  // MVPは管理者のみ
    }

    // 公開メタ：閲覧のみ
    match /publicPages/{pageId} {
      allow read: if true;
      allow write: if false;
    }

    // ブロック直編集は不可（Functions経由）
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
    request.resource.contentType.matches('audio/.*') ||
    request.resource.contentType.matches('model/.*') ||
    request.resource.contentType.matches('application/octet-stream')
  );
}
function withinSizeLimit() {
  return request.resource != null && (
    (request.resource.contentType.matches('image/.*') && request.resource.size < 25 * 1024 * 1024) ||
    (request.resource.contentType.matches('video/.*') && request.resource.size < 200 * 1024 * 1024) ||
    (request.resource.contentType.matches('audio/.*') && request.resource.size < 30 * 1024 * 1024) ||
    (request.resource.contentType.matches('model/.*') && request.resource.size < 150 * 1024 * 1024) ||
    request.resource.contentType.matches('application/octet-stream')
  );
}

service firebase.storage {
  match /b/{bucket}/o {

    // 編集（非公開）
    match /raw/users/{uid}/memories/{memoryId}/{rest=**} {
      allow read, write: if (isUser(uid) || isAdmin()) && isAllowedContentType() && withinSizeLimit();
    }
    match /proc/users/{uid}/memories/{memoryId}/{rest=**} {
      allow read, write: if (isUser(uid) || isAdmin()) && isAllowedContentType() && withinSizeLimit();
    }
    match /models/orders/{orderId}/{file=**} {
      allow read, write: if isAdmin(); // 3D候補は管理限定（MVP）
    }

    // 公開（閲覧のみ）
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

Authentication → Sign-in method

Email/Password: Enabled

Authentication → Authorized domains

localhost / 127.0.0.1（開発）

app.example.com（本番アプリ）

（公開側はAuth不要だが入れても可）

App Check

MVPはOFF（ONにする場合はWebキー設定＋SDK実装が必要）

リージョン統一

Firestore/Storage/Functionsは同一リージョン（例：asia-northeast1）

4.2 SDK初期化（単一インスタンス／環境変数は1方式に統一）
// src/lib/firebase/client.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const cfg =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    ? {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!
      }
    : JSON.parse(process.env.FIREBASE_CONFIG as string);

const app = getApps().length ? getApp() : initializeApp(cfg);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);


NG例：FIREBASE_CONFIG と NEXT_PUBLIC_FIREBASE_* を混在させる／initializeAppを複数回呼ぶ

4.3 一般ユーザーの基本API
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

await createUserWithEmailAndPassword(auth, email, password);   // サインアップ
await signInWithEmailAndPassword(auth, email, password);       // ログイン
onAuthStateChanged(auth, (user) => { /* user?.uid を使用 */ }); // 状態監視


アップロード（本人の領域にのみ書き込み）

import { ref, uploadBytes } from "firebase/storage";
import { storage, auth } from "@/lib/firebase/client";
export async function uploadAsset(memoryId: string, file: File) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("not signed in");
  const path = `raw/users/${uid}/memories/${memoryId}/uploads/${Date.now()}_${file.name}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
}

4.4 管理者（admin）付与（最初の1回だけ）
// 安全な環境で実行（Admin SDK）
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
initializeApp({ credential: applicationDefault() });
await getAuth().setCustomUserClaims("<ADMIN_UID>", { role: "admin" });
// 付与後、そのユーザーは「再ログイン」必須（トークン再発行のため）

4.5 管理画面の保護：Session Cookie + middleware（直打ちも404）

管理者が通常ログイン→idToken取得

APIへidTokenをPOST→HTTP only Session Cookieを発行

Next.js middlewareが /_admin/** でそのCookieをサーバー検証

role=adminのみ通す／それ以外は404へ偽装

セッション発行API（抜粋）

// app/api/admin/sessionLogin/route.ts
import { cookies } from "next/headers";
import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
if (!getApps().length) initializeApp({ credential: applicationDefault() });

export async function POST(req: Request) {
  const { idToken } = await req.json();
  if (!idToken) return new Response("No token", { status: 400 });
  const decoded = await getAuth().verifyIdToken(idToken);
  if (decoded.role !== "admin") return new Response("Forbidden", { status: 403 });

  const expiresIn = 7 * 24 * 60 * 60 * 1000;
  const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
  cookies().set({ name: "__session", value: sessionCookie, httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: expiresIn / 1000 });
  return new Response("ok");
}


middleware（抜粋）

// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
if (!getApps().length) initializeApp({ credential: applicationDefault() });

export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/_admin")) return NextResponse.next();
  const cookie = req.cookies.get("__session")?.value;
  if (!cookie) return NextResponse.rewrite(new URL("/404", req.url));
  try {
    const decoded = await getAuth().verifySessionCookie(cookie, true);
    if (decoded.role === "admin") return NextResponse.next();
  } catch {}
  return NextResponse.rewrite(new URL("/404", req.url));
}
export const config = { matcher: ["/_admin/:path*"] };


よくあるAuthの落とし穴（即チェック）

ログインが無言失敗 → Authorized domains 未登録

request.auth == null → 未ログイン or 別Originで動かしている

App Checkで403 → MVPはOFF。ON化は最後に

二重初期化 → getApps().length ? getApp() : initializeApp(cfg)

環境変数の混在 → 1方式に統一

5. 画面仕様
5.1 アプリ（app.example.com）

/signup, /login：Email/Pass

/dashboard：自分のMemories一覧（公開URL/QR、編集/公開）

/memories/{memoryId}：

Design：カバー/プロフィール/テーマ/フォント倍率

About：概要（Markdown）

Blocks：Album/Video/Audio/Text 追加・並べ替え・非表示

Publish：プレビュー→公開ビルド（Functions）→URL/QR表示

/_admin/**（不可視）

顧客一覧（orders）/ステータス遷移

候補3Dの登録・選択反映

決済リンク生成（Stripe）/入金反映

NFC書込済フラグ/発送管理

Session Cookie + middleware 保護（非adminは常に404）

5.2 公開（mem.example.com）

/p/{pageId}：

最初に deliver/publicPages/{pageId}/manifest.json を取得

スマホ向けリンク集UIで描画（CDNキャッシュ重視、Firestore直読なし）

OGP設定（カバーをog:image）

5.3 LP（www.example.com）

説明・料金・FAQ・はじめる→/signup（アプリへリンク）

LP自体は静的でOK（Auth不要）

6. Functions 概要
6.1 画像圧縮（onFinalize）

トリガ：raw/users/**/uploads/*

出力：proc/.../images/*_w1600.jpg と proc/.../thumbs/*_w400.jpg（sharp）

動画/音声：MVPは原本のままOK。将来は720p/128kbpsに再エンコード

6.2 公開ビルド（HTTPS）

POST /api/generate-public-page { memoryId }

認可：memory.ownerUid == uid もしくは admin

手順：

Firestoreから編集データ（publicPages / blocks / memories）取得

参照する proc/** を deliver/publicPages/{pageId}/** にコピー（不必要な巨大ファイルはスキップ）

manifest.json 生成（デザイン/順序/URL群）

publicPages.publish.status="published" / publishedAt 更新

7. キャッシュ/コスト（firebase.json）
{
  "hosting": {
    "headers": [
      { "source": "/p/**", "headers": [ { "key": "Cache-Control", "value": "public, max-age=300" } ] },
      { "source": "/deliver/**", "headers": [ { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" } ] }
    ]
  }
}


公開配信はdeliverのみ→CDNヒット率↑→通信量・費用を最小化。

動画は720p/〜3Mbps目安、画像は1600px/400pxのみ配信。

8. 受け入れ基準（UAT）

 サインアップ/ログイン→Memory作成→画像10枚→公開→/p/{pageId} 表示

 Firestore停止想定でも公開ページは表示（manifest.json＋静的ファイルのみ）

 他人のmemories/raw/proc にアクセス不可

 /_admin 非adminは常に404、adminは入れる（Session Cookie検証）

 ordersでステータスが一連の流れで遷移（assets_uploaded→model_ready→selected→paid→delivered）

 NFC：iOS/AndroidでURL起動可

 公開初回ロード1–2MB程度（サムネ中心）

 READMEに環境変数・デプロイ手順・管理者付与手順を記載

9. セットアップ手順（ゼロ→起動）

Firebaseプロジェクト作成（リージョン統一）

Auth：Email/PassをEnabled、Authorized domains に localhost・app.example.com

ルール反映

firebase deploy --only firestore:rules,storage:rules


Functions（画像圧縮/公開ビルド）を配置→

cd functions && npm i && npm run deploy


Hosting（アプリ/公開をビルド&デプロイ）→

npm run build && firebase deploy --only hosting


管理者付与（Admin SDKで role:"admin"）→管理者は再ログイン

動作確認（UAT項目順に）

10. 補足（運用/拡張）

Cloudflareは必須ではない。流量増時に前段WAF/キャッシュで追加検討。

決済はMVPで請求書→のちにStripe Webhook連携へ拡張。

3Dモデル（GLB/USDZ）ブロックは後追いで追加可能（models/→deliver/→<model-viewer>）。

個人情報は公開ページに載せない運用。

変更時はdeliver/のファイル名をハッシュ化してキャッシュ破棄を自然に。