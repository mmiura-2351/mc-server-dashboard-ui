# Dashboard Header Layout Adjustment - ダッシュボードヘッダーレイアウト調整

## 変更要求

1. FilterボタンとCreate Serverボタンを右側に配置
2. ヘッダーバーの白い背景を削除

## 実装内容

### 1. JSX構造の変更

**変更前**: ボタンが離れて配置されていた

```jsx
<div className={styles.fixedHeaderBar}>
  <div className={styles.filterButtonContainer}>
    <button className={styles.filterButton}>...</button>
  </div>
  {hasActiveFilters && <div className={styles.filterStatus}>...</div>}
  <button className={styles.createButtonHeader}>...</button>
</div>
```

**変更後**: ボタンをグループ化して右側に配置

```jsx
<div className={styles.fixedHeaderBar}>
  {hasActiveFilters && (
    <div className={styles.filterStatus}>
      {filteredServers.length}/{servers.length}
    </div>
  )}

  <div className={styles.headerActions}>
    <div className={styles.filterButtonContainer}>
      <button className={styles.filterButton}>...</button>
    </div>
    <button className={styles.createButtonHeader}>...</button>
  </div>
</div>
```

### 2. CSS変更内容

#### ヘッダーバーのスタイル

```css
.fixedHeaderBar {
  display: flex;
  justify-content: flex-end; /* 右寄せに変更 */
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  margin-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
  /* background: white; を削除 */
  position: sticky;
  top: 0;
  z-index: 100;
}
```

#### 新規追加スタイル

```css
.headerActions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.filterStatus {
  /* 既存のスタイルに追加 */
  margin-right: auto; /* 左側に配置 */
}
```

## 結果

### レイアウト改善点

1. **ボタン配置**: FilterボタンとCreate Serverボタンが右側に隣接して配置
2. **背景色**: 白い背景が削除され、より統一感のあるデザイン
3. **フィルターステータス**: アクティブフィルター時は左側に表示（10/10など）

### スクリーンショット検証

- `dashboard-buttons-right-aligned-2025-06-28T01-13-09-810Z.png`: ボタンが右側に配置
- `dashboard-with-filter-active-2025-06-28T01-14-42-894Z.png`: フィルター適用時の表示確認

## 技術的詳細

### Flexboxレイアウトの活用

- `justify-content: flex-end`: 要素を右側に配置
- `gap`: 要素間の適切な間隔を確保
- `margin-right: auto`: フィルターステータスを左端に配置

### レスポンシブ対応

モバイル表示でも同様のレイアウトを維持し、ボタンサイズのみ調整

## モバイル表示の修正

### 問題

モバイル端末でボタンが縦に配置されてしまう問題が発生

### 解決方法

Media Query内でflexboxプロパティを明示的に指定:

```css
@media (max-width: 768px) {
  .fixedHeaderBar {
    flex-direction: row; /* 横並びを強制 */
    flex-wrap: nowrap; /* 折り返しを防ぐ */
  }

  .headerActions {
    display: flex;
    flex-direction: row; /* 横並びを強制 */
    align-items: center;
  }

  .createButtonHeader {
    white-space: nowrap; /* テキストの折り返しを防ぐ */
  }
}
```

## 縦方向の余白削減

### 問題

PCでcontainerHeaderとfixedHeaderBarの縦の余白が多く、空白スペースが目立つ

### 解決方法

各要素の縦方向の余白を削減:

```css
.containerHeader {
  margin-bottom: 0.75rem; /* 2rem → 0.75rem */
}

.title {
  font-size: 1.75rem; /* 2rem → 1.75rem */
  line-height: 1.2; /* タイトルの行高さを締める */
}

.fixedHeaderBar {
  padding: 0.375rem 0; /* 0.75rem → 0.375rem */
  margin-bottom: 0.5rem; /* 1rem → 0.5rem */
}

/* モバイルも同様に調整 */
@media (max-width: 768px) {
  .fixedHeaderBar {
    padding: 0.25rem 0;
    margin-bottom: 0.375rem;
  }
}
```

### 結果

- 全体的にコンテンツが上に移動
- UIデザインは維持したまま余白のみ削減
- より多くのサーバー情報を画面に表示可能

## ステータス

✅ 完了

- ボタンの右側配置
- 白い背景の削除
- フィルターステータスの適切な配置
- デスクトップ・モバイル両方で横並びレイアウト維持
- 縦方向の余白を削減してコンパクトな表示
