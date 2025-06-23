# Nginx Configuration Guide

This guide provides configuration examples for serving MC Server Dashboard via nginx with HTTPS.

## Basic Configuration

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name your.domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name your.domain.com;

    # SSL certificate configuration
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers (nginx manages security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Next.js application
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

    # API proxy (solves Mixed Content issues)
    location /api/ {
        proxy_pass http://localhost:8000;  # Change to your backend address
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## Customization Points

### 1. Domain Name

- Replace `your.domain.com` with your actual domain

### 2. SSL Certificate Path

- For Let's Encrypt: `/etc/letsencrypt/live/your.domain.com/`
- For other certificates: Update to appropriate paths

### 3. Backend Address

- Replace `proxy_pass http://localhost:8000;` with your actual backend address
- Example: `proxy_pass http://192.168.0.50:8000;`

### 4. Security Headers

Add additional headers if needed:

```nginx
# Content Security Policy (for strict security requirements)
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://your.domain.com wss://your.domain.com; frame-ancestors 'none';" always;

# Permissions Policy (for feature restrictions)
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

## Configuration Deployment

1. Create configuration file

   ```bash
   sudo nano /etc/nginx/sites-available/mc-dashboard
   ```

2. Enable configuration

   ```bash
   sudo ln -s /etc/nginx/sites-available/mc-dashboard /etc/nginx/sites-enabled/
   ```

3. Test configuration

   ```bash
   sudo nginx -t
   ```

4. Reload nginx
   ```bash
   sudo systemctl reload nginx
   ```

## Troubleshooting

### Mixed Content Errors

- Verify `.env.local` has `NEXT_PUBLIC_API_URL` set to `https://your.domain.com`
- Ensure API requests are proxied through `/api/` path

### 502 Bad Gateway

- Check Next.js application is running: `sudo systemctl status mc-dashboard-ui`
- Verify backend API is running

### WebSocket Errors

- Confirm `Upgrade` and `Connection` headers are properly configured
- Check firewall doesn't block WebSocket connections
