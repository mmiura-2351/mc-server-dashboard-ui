# MC Server Dashboard - Frontend

Minecraft Serverの包括的な管理を行うダッシュボードのフロントエンドアプリケーションです。
FastAPI バックエンド（`../mc-server-dashboard-api/`）と連携し、サーバーのライフサイクル管理、プレイヤー管理、バックアップシステムなどの機能を提供します。

## 機能

### 認証・ユーザー管理
- **ユーザー登録**: 新規ユーザーアカウントの作成（管理者承認制）
- **ログイン**: JWT トークンベース認証
- **ユーザープロファイル**: プロファイル編集・パスワード変更
- **管理者機能**: ユーザー承認・管理

### サーバー管理
- **サーバー作成**: Vanilla/Paper/Forge サーバーの作成
- **ライフサイクル管理**: 開始・停止・再起動
- **リアルタイム監視**: WebSocket によるステータス・ログ監視
- **コンソール操作**: サーバーコマンドの実行
- **設定管理**: サーバー設定の編集

### プレイヤー・グループ管理
- **OP権限管理**: オペレーター権限の付与・削除
- **ホワイトリスト**: プレイヤーのホワイトリスト管理
- **グループ管理**: 複数サーバーでのグループ共有

### バックアップ・ファイル管理
- **自動バックアップ**: スケジュールされたバックアップ
- **手動バックアップ**: オンデマンドバックアップ作成
- **復元機能**: バックアップからの復元
- **ファイル管理**: サーバーファイルの直接編集

### 多言語サポート
- **日本語・英語**: next-intl による国際化対応
- **言語切り替え**: 動的言語変更

### 技術仕様
- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: CSS Modules
- **状態管理**: React Context API
- **エラーハンドリング**: neverthrow Result型
- **テスト**: Vitest + React Testing Library
- **リアルタイム通信**: WebSocket
- **国際化**: next-intl

## セットアップ

### 前提条件
- Node.js 18以上
- Python 3.13+ (バックエンド用)
- uv パッケージマネージャー (バックエンド用)
- **バックエンドAPI**: `../mc-server-dashboard-api/` が起動していること

### インストール

```bash
npm install
```

### バックエンドAPIの起動

**必須**: フロントエンドを起動する前に、バックエンドAPIを起動してください：

```bash
# バックエンドディレクトリに移動
cd ../mc-server-dashboard-api

# 依存関係をインストール
uv sync

# 開発サーバーを起動
uv run fastapi dev  # http://localhost:8000 で起動
```

### 環境変数

`.env.local`ファイルを作成し、以下を設定：

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 開発サーバーの起動

```bash
npm run dev
```

アプリケーションは http://localhost:3000 で起動します。

## バックエンドAPI仕様

バックエンドAPIは FastAPI で構築され、すべてのエンドポイントは `/api/v1/` プレフィックスを使用します。

### 認証エンドポイント

#### ログイン
- **エンドポイント**: `POST /api/v1/auth/token`
- **形式**: `application/x-www-form-urlencoded`
- **パラメータ**:
  - `username`: ユーザー名
  - `password`: パスワード
- **レスポンス**:
  ```json
  {
    "access_token": "string",
    "token_type": "bearer"
  }
  ```

#### ユーザー登録
- **エンドポイント**: `POST /api/v1/users/register`
- **形式**: `application/json`
- **パラメータ**:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **レスポンス**:
  ```json
  {
    "id": 1,
    "username": "string",
    "email": "string",
    "role": "user",
    "is_active": true,
    "is_approved": false
  }
  ```

### サーバー管理エンドポイント

#### サーバー一覧取得
- **エンドポイント**: `GET /api/v1/servers`
- **認証**: Bearer Token 必須

#### サーバー作成
- **エンドポイント**: `POST /api/v1/servers`
- **パラメータ**:
  ```json
  {
    "name": "string",
    "minecraft_version": "string",
    "server_type": "vanilla|paper|forge",
    "port": 25565,
    "max_memory": 2048,
    "max_players": 20
  }
  ```

#### サーバー操作
- `POST /api/v1/servers/{id}/start` - サーバー開始
- `POST /api/v1/servers/{id}/stop` - サーバー停止
- `GET /api/v1/servers/{id}/status` - ステータス取得
- `GET /api/v1/servers/{id}/logs` - ログ取得
- `POST /api/v1/servers/{id}/command` - コンソールコマンド実行

### WebSocket エンドポイント

- `WS /api/v1/ws/servers/{id}/logs` - リアルタイムログ
- `WS /api/v1/ws/servers/{id}/status` - リアルタイムステータス
- `WS /api/v1/ws/notifications` - システム通知

### ユーザー承認システム

新規登録されたユーザーは `is_approved: false` の状態で作成され、管理者による承認が必要です：

- 最初に登録されたユーザーは自動的に管理者権限と承認が付与
- その後のユーザーは管理者による承認が必要
- 承認されていないユーザーはシステムにアクセス不可

## アーキテクチャ

### ディレクトリ構造

```
src/
├── app/                     # Next.js App Router
│   ├── account/             # アカウント設定ページ
│   ├── admin/               # 管理者ページ
│   ├── dashboard/           # ダッシュボードページ
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # ホームページ
│   └── globals.css         # グローバルスタイル
├── components/             # Reactコンポーネント
│   ├── account/            # アカウント設定コンポーネント
│   ├── admin/              # 管理者コンポーネント
│   ├── auth/               # 認証関連コンポーネント
│   ├── dashboard/          # ダッシュボードコンポーネント
│   ├── language/           # 言語切り替えコンポーネント
│   ├── layout/             # レイアウトコンポーネント
│   ├── server/             # サーバー管理コンポーネント
│   └── app.tsx            # メインアプリケーション
├── contexts/               # React Context
│   ├── auth.tsx           # 認証コンテキスト
│   └── language.tsx       # 言語コンテキスト
├── i18n/                   # 国際化
│   ├── config.ts          # next-intl 設定
│   ├── request.ts         # リクエスト設定
│   └── messages/          # 翻訳ファイル
│       ├── en.json        # 英語
│       └── ja.json        # 日本語
├── services/               # API通信
│   ├── auth.ts            # 認証サービス
│   └── server.ts          # サーバー管理サービス
└── types/                  # TypeScript型定義
    ├── auth.ts            # 認証関連の型
    └── server.ts          # サーバー関連の型
```

### 設計原則

1. **関数型プログラミング**: クラスではなく関数を使用
2. **エラーハンドリング**: neverthrowを使用したResult型（例外なし）
3. **早期リターン**: ネストを避けた可読性の高いコード
4. **単一責任**: ファイルごとに単一の責任を持つ
5. **テスト駆動開発**: 各機能にテストを追加
6. **コロケーション**: 関連ファイル（テスト、スタイル）を近くに配置
7. **型安全性**: TypeScriptの厳格なルールを適用

### 状態管理

#### AuthContext
認証状態は`AuthContext`で管理され、以下の機能を提供：

- `user`: 現在のユーザー情報（役割、承認状態を含む）
- `isLoading`: ローディング状態
- `isAuthenticated`: 認証状態
- `login()`: ログイン処理（JWT トークン管理）
- `register()`: 登録処理
- `logout()`: ログアウト処理（トークン削除）

#### LanguageContext
言語設定は`LanguageContext`で管理：

- `locale`: 現在の言語（'ja' | 'en'）
- `switchLanguage()`: 言語切り替え
- `t()`: 翻訳関数

#### データ永続化
- JWT トークン: `localStorage.authToken`
- ユーザー情報: `localStorage.currentUser`
- 言語設定: `localStorage.language`

## テスト

```bash
# テスト実行
npm run test

# ウォッチモード
npm run test:watch
```

## 拡張性

### 新機能の追加

1. **新しいページ**: `src/app/`に新しいルートを追加
2. **新しいコンポーネント**: `src/components/`に機能別ディレクトリを作成
3. **新しいAPI**: `src/services/`に新しいサービスファイルを追加
4. **新しい型**: `src/types/`に型定義を追加

### セキュリティ仕様

#### ロールベースアクセス制御（RBAC）
- **admin**: 全システムアクセス、ユーザー承認権限
- **operator**: サーバー作成・管理権限
- **user**: 制限されたアクセス権限

#### セキュリティ機能
- **JWT認証**: 30分間の有効期限
- **ユーザー承認制**: 管理者による手動承認
- **CORS設定**: バックエンドで適切に設定済み
- **入力検証**: フロントエンド・バックエンド双方で実装
- **認証状態管理**: 自動ログアウト、トークン検証

#### 開発時のセキュリティ
- API通信は全てHTTPS想定（本番環境）
- 機密情報のログ出力禁止
- 環境変数による設定管理

## トラブルシューティング

### よくある問題

1. **バックエンドAPI未起動**:
   ```bash
   # バックエンドを起動
   cd ../mc-server-dashboard-api
   uv run fastapi dev
   ```

2. **CORS エラー**: バックエンドのCORS設定を確認
3. **API接続エラー**: `.env.local`のAPI URLを確認
4. **認証エラー**: ユーザー承認状態を確認（`is_approved`）
5. **WebSocket接続エラー**: JWT トークンの有効性を確認

### デバッグ

開発者ツールのコンソールでネットワークタブを確認し、
API リクエスト・レスポンスを確認してください。

#### バックエンドAPIの確認
- Swagger UI: http://localhost:8000/docs
- API Health Check: http://localhost:8000/api/v1/health

#### フロントエンドのデバッグ
- `localStorage` の内容確認（authToken, currentUser）
- ネットワークタブでのAPI通信確認
- コンソールでのエラーメッセージ確認

## 関連プロジェクト

### バックエンドAPI詳細
**場所**: `../mc-server-dashboard-api/`
**技術**: FastAPI + SQLAlchemy + SQLite + WebSocket

#### 主要機能
- **ユーザー管理**: 登録・認証・ロール管理・承認システム
- **サーバー管理**: Vanilla/Paper/Forge サーバーの作成・起動・停止・監視
- **プレイヤー管理**: OP権限・ホワイトリスト・グループ管理
- **バックアップシステム**: 自動・手動バックアップ・復元機能
- **ファイル管理**: サーバー設定ファイルの直接編集
- **リアルタイム通信**: WebSocket による状態・ログ監視
- **テンプレート機能**: サーバー作成テンプレート管理

#### API エンドポイント概要（46のユースケース）
- **認証**: `/api/v1/auth/token`, `/api/v1/users/register`
- **ユーザー管理**: `/api/v1/users/me`, `/api/v1/users/approve/{id}`
- **サーバー管理**: `/api/v1/servers/*` (CRUD・操作・監視)
- **グループ管理**: `/api/v1/groups/*` (OP・ホワイトリスト)
- **バックアップ**: `/api/v1/backups/*` (作成・復元・管理)
- **WebSocket**: `/api/v1/ws/*` (リアルタイム通信)

#### 開発・テスト環境
- **開発サーバー**: `uv run fastapi dev` (http://localhost:8000)
- **テスト環境**: `./testing/scripts/test_server.sh start` (port 8001)
- **API ドキュメント**: http://localhost:8000/docs (Swagger UI)

### プロジェクト間の連携
1. **認証**: JWT トークンによる統一認証
2. **リアルタイム**: WebSocket によるサーバー状態・ログ同期
3. **ファイル操作**: バックエンドでのサーバーディレクトリ管理
4. **セキュリティ**: CORS設定・入力検証・認可制御

**ドキュメント**: バックエンドの詳細な仕様は `../mc-server-dashboard-api/README.md` を参照
