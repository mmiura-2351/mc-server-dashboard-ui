#!/bin/bash

# MC Server Dashboard Frontend Deployment Script
# This script handles frontend deployment only

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="/opt/mcs-dashboard/ui"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command_exists node; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        log_error "Node.js version must be 18 or higher. Current: $(node --version)"
        exit 1
    fi
    
    # Check npm
    if ! command_exists npm; then
        log_error "npm is not installed."
        exit 1
    fi
    
    # Check if backend is accessible (warning only)
    if ! curl -s http://localhost:8000/docs >/dev/null 2>&1; then
        log_warning "Backend API is not accessible at http://localhost:8000"
        log_warning "Make sure the backend is running before accessing the frontend"
    fi
    
    log_success "Prerequisites check completed"
}

# Health check function
check_frontend_health() {
    local max_attempts=30
    local attempt=1
    
    log_info "Checking frontend health..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3000 >/dev/null 2>&1; then
            log_success "Frontend is healthy"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts: Frontend not ready, waiting..."
        sleep 2
        ((attempt++))
    done
    
    log_error "Frontend health check failed after $max_attempts attempts"
    return 1
}

# Service management functions
stop_service() {
    log_info "Stopping frontend service..."
    
    # Stop systemd service if it exists
    if systemctl is-active --quiet mc-dashboard-ui 2>/dev/null; then
        sudo systemctl stop mc-dashboard-ui
        log_info "Stopped frontend service"
    fi
    
    # Kill any remaining frontend processes
    pkill -f "next start" 2>/dev/null || true
    pkill -f "node.*next" 2>/dev/null || true
}


# Deploy frontend
deploy_frontend() {
    log_info "Deploying frontend..."
    
    # Create deployment directory
    sudo mkdir -p "$DEPLOY_DIR"
    sudo chown "$USER:$USER" "$DEPLOY_DIR"
    
    # Copy frontend files
    log_info "Copying application files..."
    rsync -av --exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='coverage' "$PROJECT_ROOT/" "$DEPLOY_DIR/"
    
    # Install dependencies and build
    cd "$DEPLOY_DIR"
    
    log_info "Installing production dependencies..."
    npm ci --omit=dev --ignore-scripts
    
    log_info "Building application..."
    npm run build
    
    log_success "Frontend deployed successfully"
}

# Setup systemd service
setup_systemd_service() {
    log_info "Setting up systemd service..."
    
    local service_file="$DEPLOY_DIR/deployment/mc-dashboard-ui.service"
    local system_service_file="/etc/systemd/system/mc-dashboard-ui.service"
    
    if [[ ! -f "$service_file" ]]; then
        log_error "Service file not found: $service_file"
        return 1
    fi
    
    # Replace __USER__ placeholder with current user
    sed "s/__USER__/$USER/g" "$service_file" | sudo tee "$system_service_file" > /dev/null
    
    # Reload systemd daemon
    sudo systemctl daemon-reload
    
    # Enable service
    sudo systemctl enable mc-dashboard-ui
    
    log_success "Systemd service configured successfully"
}

# Start service
start_service() {
    log_info "Starting frontend service..."
    
    # Check if systemd service exists
    if systemctl list-unit-files mc-dashboard-ui.service >/dev/null 2>&1; then
        sudo systemctl start mc-dashboard-ui
        log_info "Started frontend service"
        
        # Wait for frontend to be ready
        if ! check_frontend_health; then
            log_error "Frontend failed to start properly"
            return 1
        fi
    else
        log_warning "Frontend systemd service not found."
        log_info "You can install it with:"
        log_info "  sudo cp $DEPLOY_DIR/deployment/mc-dashboard-ui.service /etc/systemd/system/"
        log_info "  sudo systemctl daemon-reload"
        log_info "  sudo systemctl enable mc-dashboard-ui"
    fi
}

# Main deployment function
main() {
    log_info "Starting MC Server Dashboard Frontend deployment..."
    log_info "Project root: $PROJECT_ROOT"
    log_info "Deploy directory: $DEPLOY_DIR"
    
    # Check prerequisites
    check_prerequisites
    
    # Stop existing service
    stop_service
    
    # Deploy frontend
    deploy_frontend
    
    # Setup systemd service
    setup_systemd_service
    
    # Start service
    start_service
    
    log_success "Frontend deployment completed successfully!"
    log_info "Frontend URL: http://localhost:3000"
    log_info ""
    log_info "Note: Make sure the backend API is running at http://localhost:8000"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi