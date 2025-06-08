# MC Server Dashboard - Frontend

ユーザー認証機能を持つMinecraft Server管理ダッシュボードのフロントエンドアプリケーションです。

## 機能

### 認証機能
- **ユーザー登録**: 新規ユーザーアカウントの作成
- **ログイン**: 既存ユーザーのログイン
- **ダッシュボード**: ログイン後のユーザー情報表示
- **ログアウト**: セッションの終了

### 技術仕様
- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: CSS Modules
- **状態管理**: React Context API
- **エラーハンドリング**: neverthrow
- **テスト**: Vitest

## セットアップ

### 前提条件
- Node.js 18以上
- バックエンドAPI（FastAPI）が起動していること

### インストール

```bash
npm install
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

## API仕様

### 認証エンドポイント

#### ログイン
- **エンドポイント**: `POST /auth/token`
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
- **エンドポイント**: `POST /users/register`
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
    "is_active": true,
    "is_approved": false
  }
  ```

## アーキテクチャ

### ディレクトリ構造

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # ホームページ
│   └── globals.css        # グローバルスタイル
├── components/            # Reactコンポーネント
│   ├── auth/              # 認証関連コンポーネント
│   │   ├── auth-page.tsx
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   ├── dashboard/         # ダッシュボードコンポーネント
│   └── app.tsx           # メインアプリケーション
├── contexts/              # React Context
│   └── auth.tsx          # 認証コンテキスト
├── services/              # API通信
│   └── auth.ts           # 認証サービス
└── types/                 # TypeScript型定義
    └── auth.ts           # 認証関連の型
```

### 設計原則

1. **関数型プログラミング**: クラスではなく関数を使用
2. **エラーハンドリング**: neverthrowを使用したResult型
3. **早期リターン**: ネストを避けた可読性の高いコード
4. **単一責任**: ファイルごとに単一の責任を持つ
5. **テストファースト**: 各機能にテストを追加

### 状態管理

認証状態は`AuthContext`で管理され、以下の機能を提供：

- `user`: 現在のユーザー情報
- `isLoading`: ローディング状態
- `isAuthenticated`: 認証状態
- `login()`: ログイン処理
- `register()`: 登録処理
- `logout()`: ログアウト処理

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

### 認証の拡張

現在の実装では、ユーザー情報をlocalStorageに保存していますが、
本格的な実装では以下の改善が推奨されます：

1. **JWT検証**: トークンの有効性をバックエンドで検証
2. **リフレッシュトークン**: 長期間のセッション管理
3. **ロールベースアクセス制御**: 管理者権限の実装
4. **セキュリティ強化**: CSRF対策、XSS対策

## トラブルシューティング

### よくある問題

1. **CORS エラー**: バックエンドのCORS設定を確認
2. **API接続エラー**: `.env.local`のAPI URLを確認
3. **認証エラー**: ユーザー名・パスワードを確認

### デバッグ

開発者ツールのコンソールでネットワークタブを確認し、
API リクエスト・レスポンスを確認してください。
