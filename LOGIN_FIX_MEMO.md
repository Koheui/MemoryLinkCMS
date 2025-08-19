# 【重要・厳守】MemoryLinkCMS 認証フロー最終FIX版メモ

## 目的
このドキュメントは、過去に何度も発生したログイン無限ループ問題を再発させないための、**唯一の正しい認証フロー**を記録するものである。
今後の認証関連の変更は、必ずこのドキュメントに記載された原則に従うこと。

---

## ログイン問題の根本原因

過去に発生した一連のログイン失敗（ログインページにリダイレクトされ続ける無限ループ）の根本原因は、**クライアントサイドとサーバーサイドのリダイレクト処理の競合（レースコンディション）**にあった。

- **失敗パターン1 (`router.refresh()`):**
  - ログインフォーム(`auth-form.tsx`)でセッションCookie作成後に `router.refresh()` を実行。
  - `refresh()` は現在のページのデータを再取得するが、サーバーからの応答を待たずに次の処理に進むことがある。
  - Middleware(`middleware.ts`)がリクエストを検証するタイミングで、ブラウザにまだ新しいセッションCookieが設定されていない場合、「未認証」と判断されてしまい、`/login` にリダイレクトされていた。

- **失敗パターン2 (`window.location.assign('/')`):**
  - ログインフォームで `/` (トップページ) にリダイレクト。
  - トップページへのリクエストを受け取ったMiddlewareが、「認証済みだから `/pages` へリダイレクト」という処理を行う。
  - このクライアントからのリダイレクトと、サーバーからのリダイレクトが衝突し、意図しない動作や無限ループを引き起こしていた。

---

## 唯一の正しい解決策（厳守事項）

**ファイル: `src/components/auth-form.tsx`**

ログイン成功後の処理は、以下のロジックを**絶対に**変更しないこと。

```typescript
// ... 省略 ...

try {
  // 1. Firebase Authでユーザー認証（サインアップ or サインイン）
  let userCredential;
  if (type === 'signup') {
    // ... サインアップ処理
  } else {
    // ... サインイン処理
  }

  // 2. 認証情報からIDトークンを取得
  const idToken = await userCredential.user.getIdToken(true);

  // 3. サーバーにIDトークンを送り、セッションCookieの作成を依頼する
  //    サーバーからの応答が完了するまで、必ず `await` で待機する
  const res = await fetch('/api/auth/sessionLogin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  // 4. サーバー側でエラーがなかったか確認する
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.details || `セッションの作成に失敗しました。ステータス: ${res.status}`);
  }

  // 5. ★★★【最重要】★★★
  //    全ての処理が完了した後、クライアントサイドから保護されたページ（/pages）へ
  //    直接画面遷移を命令する。これにより、新しいセッションCookieを持った状態で
  //    リクエストが送信され、Middlewareが正しく認証状態を判断できる。
  window.location.assign('/pages');

} catch (error: any) {
  // ... エラー処理 ...
} finally {
  setLoading(false);
}

// ... 省略 ...
```

### なぜこの方法が確実なのか？
- **処理の同期待ち**: `await fetch(...)` で、サーバーがセッションCookieをブラウザに設定するまで、クライアントは確実に待機する。
- **直接的な遷移**: `window.location.assign('/pages')` は、その後の遷移先をサーバーのMiddlewareに委ねるのではなく、「次は必ず `/pages` に行く」という明確な命令であるため、リダイレクトの衝突が発生しない。
- **実績**: このロジックが、過去に唯一、安定してログインを成功させた方法である。

---

## 今後のルール
- 認証フローの変更時は、必ずこのメモを確認すること。
- `auth-form.tsx` の `window.location.assign('/pages')` を、安易に `router.refresh()` や `window.location.assign('/')` に変更しないこと。
- 変更が必要な場合は、このドキュメントに記載されたレースコンディションの再発リスクを慎重に評価すること。