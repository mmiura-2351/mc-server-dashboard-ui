# グローバルスタイル（globals.css）の見直し

## 実施日: 2025-06-26

## 変更前の状態

- 基本的なCSS変数（色、状態色）のみ定義
- ダークモード対応あり
- ユーティリティクラスがほとんどなし（text-balanceのみ）
- レスポンシブ対応の仕組みなし

## 実施した変更

### 1. CSS変数の拡充

- **ブレークポイント**: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- **スペーシングスケール**: space-0からspace-24まで（0rem〜6rem）
- **タイポグラフィスケール**: font-xsからfont-5xlまで（0.75rem〜3rem）
- **フォントウェイト**: light (300) からbold (700)
- **行間**: tight (1.25) からloose (2)
- **ボーダー半径**: noneからfull（0〜9999px）
- **シャドウ**: smから2xlまで6段階
- **トランジション**: fast (150ms), base (200ms), slow (300ms)
- **Z-index**: 0から50、modal (1000), popover (1100), tooltip (1200)
- **カラーパレット拡充**: primary、success、error、warning、infoの各種バリエーション
- **グレースケール**: gray-50からgray-900まで10段階

### 2. ダークモード対応の強化

- 全ての新しいCSS変数にダークモード用の値を定義
- グレースケールの反転（ダークモードでは明暗が逆転）

### 3. ユーティリティクラスの追加

- **タイポグラフィ**: text-center、truncate、各種フォントサイズ・ウェイト
- **レイアウト**: flex、grid関連のユーティリティ
- **スペーシング**: padding、margin（p-0〜p-8、m-0〜m-8、px、py、mx、my）
- **サイズ**: width、height、max-width関連
- **装飾**: border-radius、box-shadow
- **アニメーション**: transition関連
- **その他**: position、overflow、cursor、visibility、display等

### 4. レスポンシブユーティリティ

- **表示/非表示**: hide-mobile、hide-sm、hide-md、hide-lg、hide-xl
- **グリッド**: sm:grid-cols-_、md:grid-cols-_、lg:grid-cols-\*
- **コンテナ**: レスポンシブな最大幅を持つcontainerクラス

## レスポンシブ対応の詳細

- モバイルファーストのアプローチを採用
- 5つのブレークポイントで段階的にスタイルを適用
- グリッドシステムでレスポンシブなレイアウトを実現
- コンテナクラスで適切な最大幅とパディングを設定

## 今後の改善点

- カスタムプロパティを使用したテーマ切り替え機能の準備
- アニメーション関連のユーティリティクラスの追加検討
- フォーカス状態のスタイル定義の追加
- アクセシビリティ関連のユーティリティクラスの追加
