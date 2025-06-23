# Deployment Files

This directory contains deployment-related files for MC Server Dashboard UI.

**Languages**: Documentation is available in multiple languages:

- **English**: `docs/en/`
- **日本語**: `docs/ja/`

## Quick Start

### Configuration Files

- **`mc-dashboard-ui.service`** - systemd service file
- **`docs/`** - Deployment documentation in multiple languages

### Scripts (../scripts/)

- **`deploy.sh`** - Deployment script with automatic service setup
- **`service-manager.sh`** - Service management utility
- **`dev-start.sh`** - Development environment startup script

## Usage

```bash
# Production deployment
npm run deploy

# Service management
npm run service:start    # Start service
npm run service:stop     # Stop service
npm run service:restart  # Restart service
npm run service:status   # Check service status
npm run service:logs     # View logs
```

For detailed configuration guides, see:

- nginx configuration: `docs/en/nginx-configuration-guide.md` / `docs/ja/nginx-configuration-guide.md`
- Complete documentation: `docs/en/README.md` / `docs/ja/README.md`
