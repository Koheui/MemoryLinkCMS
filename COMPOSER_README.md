# Composer セットアップガイド

このプロジェクトでComposerを使用するためのセットアップ手順です。

## 前提条件

- PHP 8.1以上がインストールされていること
- Composerがインストールされていること

## インストール手順

### 1. Composerのインストール（まだインストールされていない場合）

```bash
# macOS/Linux
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Windows
# https://getcomposer.org/Composer-Setup.exe からダウンロード
```

### 2. 依存関係のインストール

```bash
composer install
```

### 3. 開発用依存関係のインストール

```bash
composer install --dev
```

## 使用方法

### 依存関係の追加

```bash
# 本番用パッケージの追加
composer require vendor/package-name

# 開発用パッケージの追加
composer require --dev vendor/package-name
```

### 依存関係の更新

```bash
composer update
```

### オートローダーの再生成

```bash
composer dump-autoload
```

### テストの実行

```bash
composer test
```

## プロジェクト構造

```
src/           # PHPソースコード
tests/         # テストファイル
composer.json  # 依存関係の定義
composer.lock  # 依存関係のロックファイル
```

## オートローダー

Composerのオートローダーを使用するには、以下のコードをPHPファイルの先頭に追加してください：

```php
require_once 'vendor/autoload.php';

use MemoryLink\Example;

$example = new Example();
$example->display();
```

## 注意事項

- `composer.lock`ファイルはバージョン管理に含めてください
- `vendor/`ディレクトリはバージョン管理に含めないでください
- 新しい依存関係を追加した後は、必ず`composer install`を実行してください
