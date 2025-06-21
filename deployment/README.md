# デプロイメントファイル

このディレクトリにはMC Server Dashboard UIのデプロイメントに必要なファイルが含まれています。

## ファイル一覧

### mc-dashboard-ui.service

systemd用のサービス定義ファイルです。

**特徴：**

- 自動起動・自動再起動設定
- セキュリティ設定（NoNewPrivileges、ProtectSystem等）
- ログ設定（journald出力）
- リソース制限設定

**配置場所：**

```bash
/etc/systemd/system/mc-dashboard-ui.service
```

**使用方法：**

```bash
# サービスファイルをコピー
sudo cp mc-dashboard-ui.service /etc/systemd/system/

# ユーザー名を実際の値に置換
sudo sed -i "s/\$USER/$USER/g" /etc/systemd/system/mc-dashboard-ui.service

# サービスの有効化と開始
sudo systemctl daemon-reload
sudo systemctl enable mc-dashboard-ui
sudo systemctl start mc-dashboard-ui
```

## 注意事項

1. **ユーザー設定**

   - サービスファイル内の`$USER`は実際のユーザー名に置換する必要があります
   - デプロイ時に`sed`コマンドで自動置換されます

2. **パス設定**

   - WorkingDirectoryは`/opt/mcs-dashboard/ui`に設定されています
   - 異なるパスにデプロイする場合は、サービスファイルを編集してください

3. **ポート設定**

   - デフォルトでポート3000を使用します
   - 変更する場合は環境変数`PORT`を調整してください

4. **セキュリティ**
   - 最小権限の原則に基づいたセキュリティ設定が適用されています
   - 必要に応じて設定を調整してください
