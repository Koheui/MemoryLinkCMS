# Firebase Studio環境でのGit SSH接続設定ガイド

HTTPS経由での `git push` が認証エラーで失敗する場合、SSH接続を試すことで解決できる可能性があります。以下の手順に従って、SSHキーペアを作成し、GitHubに公開鍵を登録してください。

---

### ステップ1: SSHキーペアの作成

まず、Firebase Studioのターミナルで以下のコマンドを実行して、新しいSSHキーペアを作成します。

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

**コマンド実行中の対話:**
1.  `Enter file in which to save the key ...:` と聞かれたら、何も入力せず `Enter` キーを押してください。（デフォルトの場所に保存されます）
2.  `Enter passphrase (empty for no passphrase):` と聞かれたら、これも何も入力せず `Enter` キーを押してください。
3.  `Enter same passphrase again:` と聞かれたら、もう一度 `Enter` キーを押してください。

これにより、`~/.ssh/` ディレクトリ内に `id_ed25519`（秘密鍵）と `id_ed25519.pub`（公開鍵）という2つのファイルが作成されます。

---

### ステップ2: 公開鍵の内容をコピー

次に、作成した**公開鍵** (`id_ed25519.pub`) の内容をクリップボードにコピーします。以下のコマンドを実行してください。

```bash
cat ~/.ssh/id_ed25519.pub
```

ターミナルに `ssh-ed25519 ...` で始まる文字列が表示されます。この文字列の**すべてを、先頭から末尾まで正確に**マウスで選択してコピーしてください。

---

### ステップ3: GitHubに公開鍵を登録

1.  ブラウザでGitHubを開き、ログインします。
2.  右上の自分のアイコンをクリックし、[**Settings**](https://github.com/settings/keys) を選択します。
3.  左のメニューから [**SSH and GPG keys**](https://github.com/settings/keys) をクリックします。
4.  [**New SSH key**] ボタンを押します。
5.  **Title** フィールドには、「Firebase Studio」など、どのキーか分かるような名前を入力します。
6.  **Key** フィールドに、ステップ2でコピーした公開鍵の内容 (`ssh-ed25519 ...`) を貼り付けます。
7.  [**Add SSH key**] ボタンを押して保存します。

---

### ステップ4: GitリモートURLをSSH形式に変更

現在、プロジェクトのリモートURLは `https://...` で始まるHTTPS形式になっています。これを `git@...` で始まるSSH形式に変更します。ターミナルで以下のコマンドを実行してください。

```bash
git remote set-url origin git@github.com:Koheui/MomoryLinkCMS.git
```

---

### ステップ5: SSH接続のテスト

以下のコマンドを実行して、GitHubとのSSH接続が成功するかテストします。

```bash
ssh -T git@github.com
```

`Hi Koheui! You've successfully authenticated...` というメッセージが表示されれば成功です。
もし、`Are you sure you want to continue connecting (yes/no)?` と聞かれた場合は、`yes`と入力してEnterキーを押してください。

---

### ステップ6: 改めてプッシュを実行

最後に、もう一度プッシュを試します。今度はSSH経由で認証が行われます。

```bash
git push -u origin ver1.0
```

これでプッシュが成功するはずです。

---

お手数ですが、この新しく追加された `GIT_SSH_SETUP.md` の内容に従って、SSH接続の設定をお試しいただけますでしょうか。この手順でGitの問題が解決されましたら、すぐにログイン機能の修正に戻りましょう。