MemoryLinkCMS 認証 指示書（保存版）
0. ゴール（これができればOK）

ブラウザ側で Firebase Auth から ID トークン取得

API に Authorization: Bearer <IDトークン> を必ず付与

サーバ側で firebase-admin を 一度だけ初期化（サービスアカウント使用）

受け取ったトークンを verifyIdToken して uid を取得 → Firestore 等に安全に保存

デバッグ用の 3 エンドポイントで “すぐに” 健全性を確認

1. 環境変数（.env.local）— ここから始める

ルート直下に .env.local を置き、以下を設定。

# ---- Client SDK 用（Firebase コンソールからそのまま）----
NEXT_PUBLIC_FIREBASE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=memorylinkcms-xxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=memorylinkcms-xxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=memorylinkcms-xxxx.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=XXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_APP_ID=1:XXXXXXXXXXXX:web:YYYYYYYYYYYYYYYY
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXX  # 使わないなら省略可

# ---- Admin SDK 用（サービスアカウント JSON を"1行で"）----
# 注意：改行は \n にエスケープ。余計な空白/行頭空行 NG。project_id は上と同じ！
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"memorylinkcms-xxxx","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxx@memorylinkcms-xxxx.iam.gserviceaccount.com","client_id":"...","token_uri":"https://oauth2.googleapis.com/token"}


重要：

project_id はクライアントと完全一致（ID トークンの aud/iss と一致しないと 401）

変更後は npm run dev を必ず再起動

2. サーバ初期化（Admin SDK は一度だけ）

src/lib/firebase/firebaseAdmin.ts

import admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getAdminApp() {
  if (app) return app;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing in .env.local');
  }

  const cred = JSON.parse(raw);

  // 初期化は一度だけ
  app = admin.apps.length
    ? admin.app()
    : admin.initializeApp({
        credential: admin.credential.cert(cred),
        // Storage/DB を使うなら projectId を明示（念のため）
        projectId: cred.project_id,
      });

  return app;
}

3. API での認証ガード（必須パターン）

src/app/api/_lib/auth.ts（共通ユーティリティ）

import { NextRequest } from 'next/server';
import admin from 'firebase-admin';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';

export async function getUidFromRequest(req: NextRequest): Promise<string> {
  // 1) Authorization: Bearer <idToken>
  const auth = req.headers.get('authorization');
  let idToken: string | undefined;
  if (auth?.startsWith('Bearer ')) idToken = auth.slice(7).trim();
  // 2) Cookie（保険）
  if (!idToken) idToken = req.cookies.get('idToken')?.value;
  if (!idToken) throw new Error('UNAUTHENTICATED: missing idToken');

  const app = getAdminApp();
  const decoded = await admin.auth(app).verifyIdToken(idToken);
  return decoded.uid; // ここで 401/403 を吐かせる
}

4. 代表 API（メディア登録の例）

src/app/api/media/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getUidFromRequest } from '../_lib/auth';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';

function err(status: number, msg: string) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req); // ★ verifyIdToken → uid
    const body = await req.json();

    const required = ['name','type','url','storagePath','projectId','size'];
    for (const k of required) {
      if (!body?.[k]) return err(400, `Missing field: ${k}`);
    }
    if (!['image','video'].includes(body.type)) {
      return err(400, 'Invalid type (must be image|video)');
    }

    const db = getFirestore(getAdminApp());
    const docRef = db.collection('mediaAssets').doc();
    const now = new Date().toISOString();

    const newAsset = { id: docRef.id, ownerId: uid, ...body, createdAt: now, updatedAt: now };
    await docRef.set(newAsset);

    return NextResponse.json({ ok: true, data: newAsset }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes('UNAUTHENTICATED') || msg.includes('verifyIdToken')) {
      return err(401, 'verifyIdToken failed');
    }
    return err(500, msg);
  }
}

5. クライアントは 必ず Bearer を付ける

src/components/media/MediaUploader.tsx（概略）

'use client';
import { useAuth } from '@/context/auth-context';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export function MediaUploader() {
  const { firebase, user, activeProjectId } = useAuth();

  async function handleUpload(file: File) {
    if (!firebase || !user || !activeProjectId) return;

    const storage = getStorage(firebase.app);
    const storagePath = `media/${activeProjectId}/${Date.now()}_${file.name}`;
    const task = uploadBytesResumable(ref(storage, storagePath), file);

    task.on('state_changed', undefined, console.error, async () => {
      const url = await getDownloadURL(task.snapshot.ref);
      const idToken = await user.getIdToken(true); // ★ここが命

      const payload = {
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        url,
        storagePath,
        projectId: activeProjectId,
        size: file.size,
      };

      const res = await fetch('/api/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`, // ★必須
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error((await res.json()).error || `status ${res.status}`);
      // 成功処理
    });
  }

  return /* input type="file" ... onChange={e => handleUpload(e.target.files?.[0]!)} */;
}

6. デバッグ 3点セット（最短で原因特定）
(1) .env 読めてる？

src/app/api/env-check/route.ts

import { NextResponse } from 'next/server';

export async function GET() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  return NextResponse.json({
    ok: true,
    hasFIREBASE_SERVICE_ACCOUNT_JSON: !!raw,
    samplePrefix: raw ? raw.slice(0, 40) : null,
  });
}

(2) Admin SDK 初期化OK？

src/app/api/debug-admin/route.ts

import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase/firebaseAdmin';
import admin from 'firebase-admin';

export async function GET() {
  try {
    const app = getAdminApp();
    const projectId = admin.app(app).options.projectId;
    return NextResponse.json({ ok: true, projectId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

(3) ブラウザでトークン確認・実投げ

src/app/debug-token/page.tsx

'use client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { useState } from 'react';

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = initializeApp(cfg);
const auth = getAuth(app);

export default function DebugToken() {
  const [uid, setUid] = useState<string|undefined>();
  const [token, setToken] = useState<string|undefined>();
  const [result, setResult] = useState<string|undefined>();

  async function getToken() {
    await signInAnonymously(auth);
    const user = auth.currentUser!;
    setUid(user.uid);
    const t = await user.getIdToken(true);
    setToken(t);
  }

  async function callApi() {
    const res = await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        name: 'debug.jpg',
        type: 'image',
        url: 'https://example.com/debug.jpg',
        storagePath: 'debug/dummy.jpg',
        projectId: 'debug-project',
        size: 1234,
      }),
    });
    setResult(`${res.status} ${await res.text()}`);
  }

  return (
    <div style={{padding:16}}>
      <button onClick={getToken}>トークン取得</button>
      <pre>UID: {uid}</pre>
      <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all'}}>token: {token?.slice(0,60)}...</pre>
      <button onClick={callApi} disabled={!token}>APIに送る</button>
      <pre>{result}</pre>
    </div>
  );
}

7. よくある落とし穴チェック

aud/iss 不一致

サービスアカウントの project_id と Auth のプロジェクトが違う → 必ず同一

.env フォーマット

JSON を 1行、改行は \n、全角/余計な空白なし

Next 再起動

.env.local を変えたら npm run dev やり直し

Authorization ヘッダ

API 呼び出しに 必ず Bearer <IDトークン> を付ける（Cookie 依存にしない）

App Check（任意）

有効化しても Token を API で必須にしない限り、認証フローには影響しない（まずは無効/監視でOK）

8. セキュリティの実運用メモ

Firestore ルールは クライアント直書き込みを極力禁止し、サーバ API 経由へ誘導

API は uid ベースの所有チェックを必ず実装（ownerId===uid）

アップロード本体は Storage クライアントSDKでOKだが、メタデータは APIで保存（今回と同じ）

9. 動作確認フロー（毎回この順で）

.env.local 設置 → 再起動

GET /api/env-check → hasFIREBASE_SERVICE_ACCOUNT_JSON: true

GET /api/debug-admin → ok: true, projectId: memorylinkcms-xxxx

/debug-token → トークン取得 → “APIに送る” → 200

本体 UI（メディア等） → Network で /api/... に Bearer が付いて 200

これを MemoryLinkCMS の最初のコミットに入れておけば、以後のプロジェクトでも認証で迷子になりません。
必要なら、この指示書を README.md にそのまま貼って使ってください！