#!/bin/bash

# MC Server Dashboard Unified Deployment Script
# This script handles both frontend and backend deployment

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_ROOT="$(dirname "$PROJECT_ROOT")/mc-server-dashboard-api"
DEPLOY_ROOT="/opt/mcs-dashboard"
FRONTEND_DIR="$DEPLOY_ROOT/ui"
BACKEND_DIR="$DEPLOY_ROOT/api"

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
    
    # Check Python (for backend)
    if ! command_exists python3; then
        log_error "Python 3 is not installed. Please install Python 3.9+ first."
        exit 1
    fi
    
    # Check uv (Python package manager for backend)
    if ! command_exists uv; then
        log_warning "uv is not installed. Backend deployment will be skipped."
        log_warning "Install uv with: curl -LsSf https://astral.sh/uv/install.sh | sh"
        SKIP_BACKEND=true
    fi
    
    # Check if backend directory exists
    if [ ! -d "$API_ROOT" ]; then
        log_warning "Backend directory not found at $API_ROOT. Backend deployment will be skipped."
        SKIP_BACKEND=true
    fi
    
    log_success "Prerequisites check completed"
}

# Health check functions
check_backend_health() {
    local max_attempts=30
    local attempt=1
    
    log_info "Checking backend health..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:8000/docs >/dev/null 2>&1; then
            log_success "Backend is healthy"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts: Backend not ready, waiting..."
        sleep 2
        ((attempt++))
    done
    
    log_error "Backend health check failed after $max_attempts attempts"
    return 1
}

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
stop_services() {
    log_info "Stopping services..."
    
    # Stop systemd services if they exist
    if systemctl is-active --quiet mc-dashboard-ui 2>/dev/null; then
        sudo systemctl stop mc-dashboard-ui
        log_info "Stopped frontend service"
    fi
    
    if systemctl is-active --quiet mc-dashboard-api 2>/dev/null; then
        sudo systemctl stop mc-dashboard-api
        log_info "Stopped backend service"
    fi
    
    # Kill any remaining processes
    pkill -f "next start" 2>/dev/null || true
    pkill -f "fastapi dev" 2>/dev/null || true
    pkill -f "uvicorn" 2>/dev/null || true
}

# Deploy backend
deploy_backend() {
    if [ "$SKIP_BACKEND" = true ]; then
        log_warning "Skipping backend deployment"
        return 0
    fi
    
    log_info "Deploying backend..."
    
    # Create backend directory
    sudo mkdir -p "$BACKEND_DIR"
    sudo chown "$USER:$USER" "$BACKEND_DIR"
    
    # Copy backend files
    cp -r "$API_ROOT"/* "$BACKEND_DIR/"
    
    # Install dependencies
    cd "$BACKEND_DIR"
    uv sync --frozen
    
    log_success "Backend deployed successfully"
}

# Deploy frontend
deploy_frontend() {
    log_info "Deploying frontend..."
    
    # Create frontend directory
    sudo mkdir -p "$FRONTEND_DIR"
    sudo chown "$USER:$USER" "$FRONTEND_DIR"
    
    # Copy frontend files
    cp -r "$PROJECT_ROOT"/* "$FRONTEND_DIR/"
    
    # Install dependencies and build
    cd "$FRONTEND_DIR"
    npm ci --omit=dev --ignore-scripts
    npm run build
    
    log_success "Frontend deployed successfully"
}

# Start services
start_services() {
    log_info "Starting services..."
    
    # Start backend first (if available)
    if [ "$SKIP_BACKEND" != true ]; then
        if systemctl list-unit-files mc-dashboard-api.service >/dev/null 2>&1; then
            sudo systemctl start mc-dashboard-api
            log_info "Started backend service"
            
            # Wait for backend to be ready
            if ! check_backend_health; then
                log_error "Backend failed to start properly"
                return 1
            fi
        else
            log_warning "Backend systemd service not found. Please set it up manually."
        fi
    fi
    
    # Start frontend
    if systemctl list-unit-files mc-dashboard-ui.service >/dev/null 2>&1; then
        sudo systemctl start mc-dashboard-ui
        log_info "Started frontend service"
        
        # Wait for frontend to be ready
        if ! check_frontend_health; then
            log_error "Frontend failed to start properly"
            return 1
        fi
    else
        log_warning "Frontend systemd service not found. Please set it up manually."
    fi
}

# Main deployment function
main() {
    log_info "Starting MC Server Dashboard deployment..."
    log_info "Project root: $PROJECT_ROOT"
    log_info "API root: $API_ROOT"
    log_info "Deploy root: $DEPLOY_ROOT"
    
    # Check prerequisites
    check_prerequisites
    
    # Stop existing services
    stop_services
    
    # Deploy components
    deploy_backend
    deploy_frontend
    
    # Start services
    start_services
    
    log_success "Deployment completed successfully!"
    log_info "Frontend: http://localhost:3000"
    if [ "$SKIP_BACKEND" != true ]; then
        log_info "Backend API: http://localhost:8000"
        log_info "API Documentation: http://localhost:8000/docs"
    fi
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi