# MC Server Dashboard - 統合デプロイメントガイド

Ubuntu ServerにMC Server Dashboard（フロントエンド・バックエンド統合）をデプロイする手順です。

## 📦 新機能：統合デプロイ

このバージョンでは以下の改善が含まれています：

- **柔軟なセキュリティ設定**: HTTPS強制やセキュリティヘッダーをオプショナル化
- **統合デプロイスクリプト**: フロントエンドとバックエンドの同時管理
- **サービス連携**: systemdサービス間の依存関係設定
- **ヘルスチェック**: 自動的なサービス監視
- **開発・本番環境対応**: 環境に応じた最適化設定

## 前提条件

- Ubuntu Server 20.04 LTS以上
- systemdが利用可能
- sudo権限のあるユーザー

## 🚀 クイックスタート（統合デプロイ）

### 1. 統合デプロイスクリプトの使用

最も簡単な方法は、統合デプロイスクリプトを使用することです：

```bash
# プロジェクトディレクトリに移動
cd /path/to/mc-server-dashboard-ui

# デプロイスクリプトを実行
./scripts/deploy.sh
```

このスクリプトが自動的に以下を実行します：

- 前提条件のチェック
- バックエンドとフロントエンドのデプロイ
- systemdサービスの設定と起動
- ヘルスチェック

### 2. サービス管理

デプロイ後は、統合サービス管理スクリプトを使用できます：

```bash
# サービス状態の確認
./scripts/service-manager.sh status

# サービスの開始
./scripts/service-manager.sh start

# サービスの停止
./scripts/service-manager.sh stop

# ログの確認
./scripts/service-manager.sh logs

# 詳細なヘルプ
./scripts/service-manager.sh help
```

## 🛠 手動デプロイ手順

### 1. 前提条件のインストール

```bash
# Node.js 20.x のインストール
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential git

# Python とuv のインストール（バックエンド用）
sudo apt-get install -y python3 python3-pip
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
```

### 2. アプリケーションの配置

```bash
# デプロイディレクトリの作成
sudo mkdir -p /opt/mcs-dashboard/{ui,api}
sudo chown $USER:$USER /opt/mcs-dashboard/{ui,api}

# フロントエンドのデプロイ
cp -r /path/to/mc-server-dashboard-ui/* /opt/mcs-dashboard/ui/
cd /opt/mcs-dashboard/ui
npm ci --omit=dev --ignore-scripts
npm run build

# バックエンドのデプロイ（バックエンドが利用可能な場合）
cp -r /path/to/mc-server-dashboard-api/* /opt/mcs-dashboard/api/
cd /opt/mcs-dashboard/api
uv sync --frozen
```

### 3. 環境設定

```bash
# フロントエンド環境設定
cd /opt/mcs-dashboard/ui
cp .env.example .env.local

# 環境変数の設定例（必要に応じて編集）
cat > .env.local << 'EOF'
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Application Configuration
NEXT_PUBLIC_APP_NAME=MC Server Dashboard
NEXT_PUBLIC_DEFAULT_LANGUAGE=en

# Production settings
NODE_ENV=production

# Security Configuration (本番環境では適宜調整)
ENABLE_HTTPS_REDIRECT=false
ENABLE_ENHANCED_SECURITY=false
EOF
```

### 4. systemdサービスの設定

```bash
# サービスファイルのコピー
sudo cp /opt/mcs-dashboard/ui/deployment/mc-dashboard-ui.service /etc/systemd/system/
sudo cp /opt/mcs-dashboard/ui/deployment/mc-dashboard-api.service /etc/systemd/system/

# ユーザー名の置換
sudo sed -i "s/\$USER/$USER/g" /etc/systemd/system/mc-dashboard-*.service

# サービスの有効化と開始
sudo systemctl daemon-reload
sudo systemctl enable mc-dashboard-api mc-dashboard-ui
sudo systemctl start mc-dashboard-api mc-dashboard-ui
```

### 5. 動作確認

```bash
# サービス状態の確認
sudo systemctl status mc-dashboard-api mc-dashboard-ui

# アプリケーションの動作確認
curl http://localhost:8000/docs  # バックエンドAPI
curl http://localhost:3000       # フロントエンド
```

## 🔧 環境設定オプション

### セキュリティ設定

本プロジェクトは柔軟なセキュリティ設定をサポートしています：

```bash
# 高セキュリティ環境での設定例
cat > .env.local << 'EOF'
NODE_ENV=production
ENABLE_HTTPS_REDIRECT=true
HTTPS_HOSTNAME=your-domain.com
ENABLE_ENHANCED_SECURITY=true
EOF
```

### 開発環境での実行

```bash
# 開発環境用スタートスクリプト
./scripts/dev-start.sh
```

このスクリプトはフロントエンドとバックエンドを開発モードで同時起動します。

## 📊 サービス管理

### サービス状態の確認

```bash
# 統合管理スクリプトによる確認
./scripts/service-manager.sh status

# 手動確認
sudo systemctl status mc-dashboard-ui
sudo systemctl status mc-dashboard-api
```

### ログの確認

```bash
# 統合ログビューア
./scripts/service-manager.sh logs

# 個別サービスのログ
sudo journalctl -u mc-dashboard-ui -f
sudo journalctl -u mc-dashboard-api -f
```

### サービスの再起動

```bash
# 統合再起動
./scripts/service-manager.sh restart

# 個別再起動
sudo systemctl restart mc-dashboard-ui
sudo systemctl restart mc-dashboard-api
```

## 🔄 アプリケーションの更新

### 統合更新（推奨）

```bash
# 最新のコードを取得
cd /path/to/mc-server-dashboard-ui
git pull origin main

# 統合デプロイスクリプトで更新
./scripts/deploy.sh
```

### 手動更新

```bash
# サービスの停止
sudo systemctl stop mc-dashboard-ui mc-dashboard-api

# コードの更新
cd /opt/mcs-dashboard/ui
git pull origin main
npm ci --omit=dev --ignore-scripts
npm run build

# バックエンドの更新（該当する場合）
cd /opt/mcs-dashboard/api
git pull origin main
uv sync --frozen

# サービスの再開
sudo systemctl start mc-dashboard-api mc-dashboard-ui
```

## 🐛 トラブルシューティング

### 共通の問題

#### 1. サービスが起動しない

```bash
# 詳細なログを確認
sudo journalctl -u mc-dashboard-ui --no-pager
sudo journalctl -u mc-dashboard-api --no-pager

# 手動でアプリケーションを起動して確認
cd /opt/mcs-dashboard/ui
npm start
```

#### 2. ポートの競合

```bash
# ポートの使用状況を確認
sudo ss -tlnp | grep -E ":(3000|8000)"

# プロセスの強制終了
sudo pkill -f "next start"
sudo pkill -f "fastapi dev"
```

#### 3. 権限エラー

```bash
# ディレクトリの所有者を修正
sudo chown -R $USER:$USER /opt/mcs-dashboard

# ログディレクトリの権限確認
ls -la /var/log/
```

#### 4. ネットワーク接続エラー

```bash
# バックエンドの接続確認
curl -v http://localhost:8000/docs

# フロントエンドからバックエンドへの接続確認
curl -v -H "Origin: http://localhost:3000" http://localhost:8000/api/v1/auth/test
```

### セキュリティ関連の問題

#### HTTPS設定でアクセスできない場合

```bash
# 環境変数を確認
cat /opt/mcs-dashboard/ui/.env.local

# HTTPSリダイレクトを無効化
sed -i 's/ENABLE_HTTPS_REDIRECT=true/ENABLE_HTTPS_REDIRECT=false/' /opt/mcs-dashboard/ui/.env.local

# サービス再起動
sudo systemctl restart mc-dashboard-ui
```

#### CSP（Content Security Policy）エラー

```bash
# ブラウザの開発者ツールでCSPエラーを確認
# 必要に応じて ENABLE_ENHANCED_SECURITY を false に設定

echo "ENABLE_ENHANCED_SECURITY=false" >> /opt/mcs-dashboard/ui/.env.local
sudo systemctl restart mc-dashboard-ui
```

## 🔐 セキュリティ考慮事項

### 1. ファイアウォール設定

```bash
# UFWを使用した基本的なファイアウォール設定
sudo ufw allow ssh
sudo ufw allow 3000/tcp  # フロントエンド
sudo ufw allow 8000/tcp  # バックエンド（必要に応じて）
sudo ufw enable
```

### 2. SSL/TLS設定

本番環境では、リバースプロキシ（nginx/Apache）を使用してSSL終端を行うことを推奨します。

### 3. 定期メンテナンス

```bash
# システムの更新
sudo apt update && sudo apt upgrade

# Node.jsの更新
# 新しいLTSバージョンが利用可能な場合

# ログのローテーション
sudo journalctl --vacuum-time=30d
```

## 📚 追加リソース

- **開発ガイド**: `README.md`
- **API仕様**: http://localhost:8000/docs（サービス起動後）
- **サービス管理**: `./scripts/service-manager.sh help`
- **ログ場所**:
  - システムログ: `sudo journalctl -u mc-dashboard-*`
  - 開発ログ: `/tmp/mc-dashboard-*.log`

## 🆘 サポート

問題が発生した場合：

1. **ログの確認**: `./scripts/service-manager.sh logs`
2. **サービス状態**: `./scripts/service-manager.sh status`
3. **手動デバッグ**: アプリケーションを手動で起動してエラーメッセージを確認
4. **GitHub Issues**: バグレポートや改善提案

---

**注意**: このガイドは統合デプロイメントシステムv2.0以降に対応しています。以前のバージョンからアップグレードする場合は、既存の設定ファイルのバックアップを取ってから実行してください。
