# デプロイメントファイル

このディレクトリには、MC Server Dashboard UIのデプロイメントに関連するファイルが含まれています。

## ファイル概要

### 📄 設定ファイル

- **`nginx-configuration-guide.md`** - nginx設定ガイド（HTTPS環境用）
- **`mc-dashboard-ui.service`** - systemdサービスファイル

### 🔧 スクリプト（../scripts/）

- **`deploy.sh`** - デプロイメントスクリプト
- **`service-manager.sh`** - サービス管理ユーティリティ
- **`dev-start.sh`** - 開発環境起動スクリプト

## 使用方法

### 開発環境

```bash
# 開発サーバーの起動
npm run dev:start
```

### 本番環境デプロイ

```bash
# デプロイの実行
npm run deploy

# サービス管理
npm run service:start    # サービス開始
npm run service:stop     # サービス停止
npm run service:restart  # サービス再起動
npm run service:status   # サービス状態確認
npm run service:logs     # ログ表示
```

### nginx設定

1. `nginx-configuration-guide.md` を参照
2. 設定ファイルを作成・適用
3. SSL証明書を設定
4. nginxを再起動

## 重要事項

- 本番環境では `.env.local` で `NODE_ENV=production` に設定
- nginx経由の場合は `NEXT_PUBLIC_API_URL` を HTTPS URL に変更
- Mixed Content問題回避のため nginx でAPIプロキシ設定が必要
