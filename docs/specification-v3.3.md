# specification-v3.3.md
更新日: 2025-08-30

## 目的（v3.2 → v3.3）
NFC書き込み・印刷・出荷などの“現場オペ”を **CMSから分離** し、専用の **NFC Writer アプリ** に委譲する。  
CMSは「申込→認証→編集→公開（静的配信）」に集中させる。

---

## 結論（開発者向けショートノート）
- v3.2 の実装から **以下を“削除/停止/非表示”** にする（＝残すものは書かない）。
- 書き込み・印刷・出荷の **工程更新は Functions API 経由のみ**（CMSフロント直更新は禁止）。
- NFC Writer が利用する **公開API** は本書末の「APIコントラクト」を参照。

---

## 廃止・停止する機能（CMSから撤去）
1) **NFC関連 UI/処理**
   - `_admin` 画面の **NFC書き込みボタン**／書き込みウィザード
   - タグ読取・書込・再検証のフロント実装
   - ブラウザWebNFCの実験的コード

2) **印刷・梱包・出荷の UI/処理**
   - QR台紙 一括PDF 生成ボタン
   - `print.qrPrinted` 等の工程トグルを **フロントから切り替える操作**
   - 出荷/梱包のフロント更新

3) **顧客一括管理の“現場向け”機能**
   - 大量行向けの一括操作（CSV一括・一括遷移）
   - 発送番号入力・伝票操作UI

> 備考：**参照用の一覧表示（読み取りのみ）は残してOK**。ただし編集系の操作要素は削除。

---

## Firestore / ルール調整
- `orders/*` の **write を全面禁止（クライアント）**。工程更新は Functions のみ。
- `claimRequests/*` は引き続き **クライアント書込不可**（Functionsのみ）。
- `memories/*`, `assets/*` は v3.1 どおり（owner/admin のみ）。
- `auditLogs/*` は Functions のみ作成。

**追記ルール例（要反映）**
```js
match /orders/{id} {
  allow read: if isSuperAdmin() ||
              (isTenantAdmin() && resource.data.tenant == request.auth.token.adminTenant);
  allow write: if false; // ← CMSフロントからの工程更新を禁止
}