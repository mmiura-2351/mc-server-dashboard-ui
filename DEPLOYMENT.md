# デプロイメントガイド

Ubuntu ServerにMC Server Dashboard UIをデプロイする手順です。

## 前提条件

- Ubuntu Server 20.04 LTS以上
- Node.js 18以上がインストール済み
- npm または yarn がインストール済み
- systemdが利用可能
- 現在のユーザーでの実行

## デプロイ手順

### 1. アプリケーションの配置

```bash
# デプロイディレクトリの作成
sudo mkdir -p /opt/mcs/dashboard/ui
sudo chown $USER:$USER /opt/mcs/dashboard/ui

# GitHubからソースコードをクローン
git clone https://github.com/your-org/mc-server-dashboard-ui.git /opt/mcs/dashboard/ui

# 作業ディレクトリに移動
cd /opt/mcs/dashboard/ui
```

### 2. 依存関係のインストール

```bash
# Node.jsの依存関係をインストール
npm ci --production

# プロダクションビルドの実行
npm run build
```

### 3. 環境設定

```bash
# 環境設定ファイルの作成
cp .env.example .env.local

# 必要に応じて環境変数を編集
nano .env.local
```

**プロダクション用環境変数例：**

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Application Configuration
NEXT_PUBLIC_APP_NAME=MC Server Dashboard
NEXT_PUBLIC_DEFAULT_LANGUAGE=en

# Production settings
NODE_ENV=production
```

### 4. systemdサービスの設定

```bash
# サービスファイルをシステムディレクトリにコピー
sudo cp deployment/mc-dashboard-ui.service /etc/systemd/system/

# サービスファイル内のユーザー名を実際のユーザー名に置換
sudo sed -i "s/\$USER/$USER/g" /etc/systemd/system/mc-dashboard-ui.service

# サービスファイルの権限設定
sudo chmod 644 /etc/systemd/system/mc-dashboard-ui.service

# systemdデーモンの再読み込み
sudo systemctl daemon-reload

# サービスの有効化（自動起動設定）
sudo systemctl enable mc-dashboard-ui

# サービスの開始
sudo systemctl start mc-dashboard-ui
```

### 5. 動作確認

```bash
# サービス状態の確認
sudo systemctl status mc-dashboard-ui

# ログの確認
sudo journalctl -u mc-dashboard-ui -f

# アプリケーションの動作確認
curl http://localhost:3000
```

## サービス管理コマンド

```bash
# サービスの開始
sudo systemctl start mc-dashboard-ui

# サービスの停止
sudo systemctl stop mc-dashboard-ui

# サービスの再起動
sudo systemctl restart mc-dashboard-ui

# サービスの状態確認
sudo systemctl status mc-dashboard-ui

# ログの確認（リアルタイム）
sudo journalctl -u mc-dashboard-ui -f

# ログの確認（過去分も含む）
sudo journalctl -u mc-dashboard-ui --no-pager
```

## アプリケーションの更新

GitHubリポジトリの最新バージョンに更新する手順：

```bash
# アプリケーションディレクトリに移動
cd /opt/mcs/dashboard/ui

# サービスの停止
sudo systemctl stop mc-dashboard-ui

# 最新のコードを取得
git pull origin main

# 依存関係の更新
npm ci --production

# 新しいビルドの作成
npm run build

# サービスの再開
sudo systemctl start mc-dashboard-ui

# 動作確認
sudo systemctl status mc-dashboard-ui
```

## トラブルシューティング

### サービスが起動しない場合

```bash
# 詳細なログを確認
sudo journalctl -u mc-dashboard-ui --no-pager

# 設定ファイルの構文確認
sudo systemctl status mc-dashboard-ui

# 手動でアプリケーションを起動して確認
cd /opt/mcs/dashboard/ui
npm start
```

### ポートの競合

```bash
# ポート3000の使用状況を確認
sudo netstat -tlnp | grep 3000

# または
sudo ss -tlnp | grep 3000
```

### 権限エラー

```bash
# ディレクトリの所有者を確認・修正
sudo chown -R $USER:$USER /opt/mcs/dashboard/ui

# 実行権限の確認
ls -la /opt/mcs/dashboard/ui
```

## セキュリティ考慮事項

1. **ファイアウォール設定**

   - 必要なポートのみ開放
   - 適切なアクセス制御の実装

2. **アップデート**

   - 定期的なNode.jsとnpmの更新
   - セキュリティパッチの適用

3. **ログ監視**

   - 異常なアクセスパターンの監視
   - エラーログの定期確認

4. **バックアップ**
   - 設定ファイルのバックアップ
   - アプリケーションデータのバックアップ（必要に応じて）
