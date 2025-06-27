# モバイル向けコンパクトレイアウトの実装

## 実施日: 2025-06-27

## 概要

ユーザーからの要望「モバイル端末では情報を最低限に抑え、一覧性を高めましょう。アクション要素もなくてよいです。サーバー名、バージョン、ステータス辺りは欲しいです。」に対応し、モバイル専用のコンパクトなカードレイアウトを実装しました。

## 問題点の分析

### 改善前のモバイルUIの問題

1. **情報密度が低い** - 各カードが大きすぎて画面に1-2枚しか表示されない
2. **操作性が悪い** - 詳細情報やアクションボタンが冗長
3. **重要情報が見えにくい** - 多すぎる情報で重要な内容が埋もれる
4. **視覚的階層が弱い** - すべての情報が同じ重みで表示される

## 実装内容

### 1. コンパクトレイアウトの設計

#### 新しいレイアウト構造

```
┌─────────────────────────────────────────┐
│ Server Name                    🟢     │
│ [1.21.6] • [vanilla]          Running │
└─────────────────────────────────────────┘
```

#### 表示する情報

- **サーバー名** - メインタイトル
- **バージョン** - 色付きバッジで表示
- **サーバータイプ** - 色付きバッジで表示
- **ステータス** - アイコン＋テキストで視覚的に表示

#### 削除された情報

- プレイヤー数、メモリ使用量、ポート番号
- サーバー説明文
- アクションボタン（start/stop/settings）
- クリックヒント

### 2. HTMLマークアップの変更

#### 修正前（詳細カードレイアウト）

```jsx
<div className={styles.serverCard} onClick={() => handleServerClick(server.id)}>
  <div className={styles.serverHeader}>
    <h3 className={styles.serverName}>{server.name}</h3>
    <span className={`${styles.status} ${getStatusColor(server.status)}`}>
      {getStatusText(server.status)}
    </span>
  </div>

  <div className={styles.serverInfo}>
    <div className={styles.infoRow}>
      <span className={styles.label}>{t("servers.fields.version")}:</span>
      <span>{server.minecraft_version}</span>
    </div>
    <div className={styles.infoRow}>
      <span className={styles.label}>{t("servers.fields.type")}:</span>
      <span className={styles.serverType}>{server.server_type}</span>
    </div>
    <div className={styles.infoRow}>
      <span className={styles.label}>{t("servers.fields.players")}:</span>
      <span>0/{server.max_players}</span>
    </div>
    <div className={styles.infoRow}>
      <span className={styles.label}>{t("servers.fields.memory")}:</span>
      <span>{server.max_memory}MB</span>
    </div>
    <div className={styles.infoRow}>
      <span className={styles.label}>{t("servers.fields.port")}:</span>
      <span>{server.port}</span>
    </div>
  </div>

  {server.description && (
    <p className={styles.serverDescription}>{server.description}</p>
  )}

  <div className={styles.serverCardFooter}>
    <span className={styles.clickHint}>{t("servers.clickToManage")}</span>
    <span className={styles.arrow}>→</span>
  </div>
</div>
```

#### 修正後（コンパクトレイアウト）

```jsx
<div className={styles.serverCard} onClick={() => handleServerClick(server.id)}>
  <div className={styles.compactHeader}>
    <div className={styles.serverInfo}>
      <h3 className={styles.serverName}>{server.name}</h3>
      <div className={styles.serverMeta}>
        <span className={styles.versionBadge}>{server.minecraft_version}</span>
        <span className={styles.separator}>•</span>
        <span className={styles.typeBadge}>{server.server_type}</span>
      </div>
    </div>
    <div className={styles.statusSection}>
      <span className={styles.statusIcon}>{getStatusIcon(server.status)}</span>
      <span className={`${styles.statusText} ${getStatusColor(server.status)}`}>
        {getStatusText(server.status)}
      </span>
    </div>
  </div>
</div>
```

### 3. CSS スタイルの実装

#### 新しいコンパクトレイアウト用スタイル

```css
/* Compact mobile layout styles */
.compactHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.serverInfo {
  flex: 1;
  min-width: 0;
}

.serverMeta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
  flex-wrap: wrap;
}

.versionBadge {
  background-color: #ede9fe;
  color: #7c3aed;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.typeBadge {
  background-color: #ecfdf5;
  color: #065f46;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.separator {
  color: #9ca3af;
  font-size: 0.875rem;
}

.statusSection {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  flex-shrink: 0;
}

.statusIcon {
  font-size: 1.25rem;
  line-height: 1;
}

.statusText {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  white-space: nowrap;
}
```

#### レスポンシブ対応の改善

```css
/* 768px以下でコンパクト表示 */
@media (max-width: 768px) {
  .serverGrid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .serverCard {
    padding: 0.875rem;
    border-radius: 8px;
    min-height: auto;
  }

  .serverName {
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.3;
    margin: 0;
    color: #1f2937;
  }

  .statusText {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
  }

  .statusIcon {
    font-size: 1rem;
  }
}

/* 480px以下でさらにコンパクト */
@media (max-width: 480px) {
  .serverCard {
    padding: 0.75rem;
  }

  .serverName {
    font-size: 0.875rem;
    font-weight: 600;
  }

  .versionBadge,
  .typeBadge {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
  }

  .statusText {
    font-size: 0.5rem;
    padding: 0.125rem 0.25rem;
  }

  .statusIcon {
    font-size: 0.875rem;
  }

  .serverMeta {
    gap: 0.375rem;
  }
}
```

### 4. テストの更新

#### 期待値の調整

新しいコンパクトレイアウトに合わせてテストの期待値を更新しました：

```typescript
// 修正前: 詳細情報も両方に表示されることを期待
expect(screen.getAllByText("2048MB")).toHaveLength(2); // Table + card

// 修正後: テーブルのみに表示されることを期待
expect(screen.getByText("1024/2048MB")).toBeInTheDocument(); // Running server shows used/max
```

#### テスト結果

- **全78テスト成功** ✅
- モバイルレイアウトの変更にすべて対応

## 改善効果

### 1. 情報密度の向上

- **改善前**: 画面に1-2サーバーのみ表示
- **改善後**: 画面に4-6サーバー表示可能

### 2. 重要情報の優先表示

- サーバー名を最も目立つように配置
- ステータスを視覚的なアイコン＋テキストで強調
- バージョンとタイプを色付きバッジで見やすく表示

### 3. 操作性の向上

- アクション要素を削除して誤タップを防止
- カード全体のタップエリアでナビゲーション
- 必要な情報への素早いアクセス

### 4. 視覚的階層の改善

- 情報の重要度に応じたスタイリング
- 色とサイズでの視覚的グルーピング
- 適切な余白とレイアウト

## 技術的特徴

### 1. レスポンシブ対応

- CSS media queryによる段階的なサイズ調整
- 768px、480px のブレークポイント
- デスクトップではテーブル、モバイルではカード

### 2. 色付きバッジシステム

- バージョン: 紫系（#ede9fe / #7c3aed）
- サーバータイプ: 緑系（#ecfdf5 / #065f46）
- ステータス: 既存の色システムを継承

### 3. アクセシビリティ

- 適切なセマンティクス（h3要素でサーバー名）
- 十分なカラーコントラスト
- タッチフレンドリーなタップエリア

## 検証結果

### テスト結果

- **全78テスト成功** ✅
- 新しいレイアウトに完全対応

### 型チェック結果

- **TypeScriptエラーなし** ✅
- 型安全性維持

### Lint結果

- **ESLintエラー/警告なし** ✅
- コード品質基準維持

## ユーザー体験の向上

### モバイルでの操作性

1. **一覧性**: より多くのサーバーを一度に確認可能
2. **識別性**: バッジとアイコンで瞬時にサーバー識別
3. **操作性**: シンプルなタップ操作でアクセス
4. **視認性**: 重要な情報が明確に表示

### 情報アーキテクチャ

- **Level 1**: サーバー名（最重要）
- **Level 2**: ステータス（視覚的に強調）
- **Level 3**: バージョン・タイプ（バッジで整理）

## 完了ステータス

**モバイル向けコンパクトレイアウト実装: 完了** ✅

モバイルでの一覧性が大幅に向上し、必要最小限の情報で効率的なサーバー管理が可能になりました。ユーザーの要求通り、アクション要素を削除し、サーバー名・バージョン・ステータスの重要情報に焦点を当てたデザインとなっています。
