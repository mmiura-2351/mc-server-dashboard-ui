# Nginx設定ガイド

このガイドは、MC Server DashboardをnginxでHTTPS提供するための設定例を提供します。

## 基本設定

```nginx
# HTTPからHTTPSへのリダイレクト
server {
    listen 80;
    server_name your.domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS設定
server {
    listen 443 ssl http2;
    server_name your.domain.com;

    # SSL証明書設定
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # SSL設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # セキュリティヘッダー（nginxがセキュリティを管理）
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Next.jsアプリケーション
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # APIプロキシ（Mixed Content問題を解決）
    location /api/ {
        proxy_pass http://localhost:8000;  # バックエンドのアドレスに変更
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket対応
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # タイムアウト設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## カスタマイズポイント

### 1. ドメイン名

- `your.domain.com` を実際のドメインに変更

### 2. SSL証明書パス

- Let's Encryptの場合: `/etc/letsencrypt/live/your.domain.com/`
- 他の証明書の場合: 適切なパスに変更

### 3. バックエンドアドレス

- `proxy_pass http://localhost:8000;` を実際のバックエンドアドレスに変更
- 例: `proxy_pass http://192.168.0.50:8000;`

### 4. セキュリティヘッダー

必要に応じて追加のヘッダーを設定:

```nginx
# Content Security Policy（厳格なセキュリティが必要な場合）
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://your.domain.com wss://your.domain.com; frame-ancestors 'none';" always;

# Permissions Policy（機能制限が必要な場合）
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

## 設定のデプロイ

1. 設定ファイルを作成

   ```bash
   sudo nano /etc/nginx/sites-available/mc-dashboard
   ```

2. 設定を有効化

   ```bash
   sudo ln -s /etc/nginx/sites-available/mc-dashboard /etc/nginx/sites-enabled/
   ```

3. 設定テスト

   ```bash
   sudo nginx -t
   ```

4. nginx再読み込み
   ```bash
   sudo systemctl reload nginx
   ```

## トラブルシューティング

### Mixed Content エラー

- `.env.local` の `NEXT_PUBLIC_API_URL` が `https://your.domain.com` に設定されているか確認
- APIリクエストが `/api/` パス経由でプロキシされているか確認

### 502 Bad Gateway

- Next.jsアプリケーションが動作しているか確認: `sudo systemctl status mc-dashboard-ui`
- バックエンドAPIが動作しているか確認

### WebSocket エラー

- `Upgrade` と `Connection` ヘッダーが適切に設定されているか確認
- ファイアウォールがWebSocket接続をブロックしていないか確認
