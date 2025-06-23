# Deployment Files

This directory contains deployment-related files for MC Server Dashboard UI.

## File Overview

### 📄 Configuration Files

- **`nginx-configuration-guide.md`** - nginx configuration guide for HTTPS environments
- **`mc-dashboard-ui.service`** - systemd service file

### 🔧 Scripts (../scripts/)

- **`deploy.sh`** - Deployment script
- **`service-manager.sh`** - Service management utility
- **`dev-start.sh`** - Development environment startup script

## Usage

### Development Environment

```bash
# Start development server
npm run dev:start
```

### Production Deployment

```bash
# Execute deployment
npm run deploy

# Service management
npm run service:start    # Start service
npm run service:stop     # Stop service
npm run service:restart  # Restart service
npm run service:status   # Check service status
npm run service:logs     # View logs
```

### nginx Configuration

1. Refer to `nginx-configuration-guide.md`
2. Create and apply configuration files
3. Configure SSL certificates
4. Restart nginx

## Important Notes

- Set `NODE_ENV=production` in `.env.local` for production environments
- Change `NEXT_PUBLIC_API_URL` to HTTPS URL when using nginx
- nginx API proxy configuration required to avoid Mixed Content issues
