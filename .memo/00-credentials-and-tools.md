# 開発環境情報

## UI確認方法

- Playwrightのheadlessモードを使用してUIを確認可能
- サーバーはユーザーが起動しているため、そのまま接続

## アプリケーション接続情報

- URL: http://localhost:3000
- 認証情報:
  - ユーザー名: admin
  - パスワード: Admin123\_

## Playwright使用ルール

### 基本操作手順

1. **ブラウザ起動時の設定**

   ```bash
   # デスクトップサイズ
   mcp__playwright__playwright_navigate(
     url="http://localhost:3000",
     width=1280,
     height=720,
     headless=true
   )

   # モバイルサイズ
   mcp__playwright__playwright_navigate(
     url="http://localhost:3000",
     width=375,
     height=667,
     headless=true
   )
   ```

2. **必須の端末サイズ確認**

   - **デスクトップ分析**: 必ず1280px x 720px以上で確認
   - **モバイル分析**: 必ず375px x 667px以下で確認
   - スクリーンショット取得前に目的の端末サイズか確認

3. **スクリーンショット取得**

   ```bash
   # フルページスクリーンショット（推奨）
   mcp__playwright__playwright_screenshot(
     name="descriptive-name",
     fullPage=true,
     savePng=true
   )

   # ビューポートのみ（インタラクション確認時）
   mcp__playwright__playwright_screenshot(
     name="interaction-check",
     fullPage=false,
     savePng=true
   )
   ```

### UI分析時の必須チェック項目

1. **文字切れチェック**

   - 英語・日本語の単語が完全に表示されているか
   - ボタンのテキストが見切れていないか
   - ドロップダウンメニューの項目が全て表示されているか

2. **レイアウト確認**

   - 要素が重なっていないか
   - コンテナからはみ出していないか
   - 適切な余白・間隔が保たれているか
   - ユーザーの指示に従っているか

3. **タッチ対応確認（モバイル）**

   - ボタンが最低44px x 44px以上の大きさか
   - タップ領域が十分確保されているか
   - 隣接要素と十分な間隔があるか

4. **視認性確認**
   - 文字色と背景色のコントラストが十分か
   - フォントサイズが読みやすいか
   - アイコンが認識しやすいか

### 操作確認手順

1. **インタラクション前の状態確認**

   ```bash
   # 操作前のスクリーンショット
   mcp__playwright__playwright_screenshot(name="before-interaction")
   ```

2. **操作実行**

   ```bash
   # クリック操作
   mcp__playwright__playwright_click(selector="button[aria-haspopup='listbox']")

   # フォーム入力
   mcp__playwright__playwright_fill(selector="input[name='username']", value="test")
   ```

3. **操作後の状態確認**
   ```bash
   # 操作後のスクリーンショット
   mcp__playwright__playwright_screenshot(name="after-interaction")
   ```

### レスポンシブ対応確認

1. **デスクトップ → モバイル順序で確認**

   ```bash
   # 1. デスクトップで確認
   # 2. ブラウザクローズ
   mcp__playwright__playwright_close()
   # 3. モバイルサイズで再起動
   # 4. 同じ操作を実行
   # 5. 結果を比較分析
   ```

2. **両端末での動作比較**
   - 同じ機能が両方で正常動作するか
   - UIの見た目に重大な差異がないか
   - モバイル特有の問題（文字切れ、タップしにくさ）がないか

### 問題発見時の対応

1. **修正前の記録**

   - 問題のスクリーンショットを保存
   - 具体的な問題内容を記録

2. **修正実施**

   - CSSまたはコンポーネントを修正

3. **修正後の検証**
   - 同じ手順でスクリーンショット取得
   - 修正前後の比較分析
   - 他の端末でも問題が解決されているか確認

### ブラウザセッション管理

1. **セッション終了**

   ```bash
   # 作業完了時は必ずブラウザをクローズ
   mcp__playwright__playwright_close()
   ```

2. **新しいセッション開始**
   - 端末サイズ変更時は必ず新しいセッションで開始
   - キャッシュの影響を避けるため適宜セッションリセット

### 使用方法メモ

- UI変更の前後でPlaywrightを使用してスクリーンショットを撮影
- レスポンシブ対応の確認（モバイル、タブレット、デスクトップサイズ）
- 実際の操作を通じた動作確認
- 必ず修正前後の比較を実施し、問題が解決されていることを視覚的に確認
