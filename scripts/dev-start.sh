#!/bin/bash

# MC Server Dashboard Development Start Script
# Starts both frontend and backend in development mode

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_ROOT="$(dirname "$PROJECT_ROOT")/mc-server-dashboard-api"

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

# Function to check if port is in use
is_port_in_use() {
    lsof -i:"$1" >/dev/null 2>&1
}

# Clean up function
cleanup() {
    log_info "Shutting down services..."
    
    # Kill background processes
    for pid in $BACKEND_PID $FRONTEND_PID; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            log_info "Stopping process $pid"
            kill "$pid" 2>/dev/null || true
        fi
    done
    
    # Wait a moment for processes to stop
    sleep 2
    
    # Force kill if still running
    for pid in $BACKEND_PID $FRONTEND_PID; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            log_warning "Force killing process $pid"
            kill -9 "$pid" 2>/dev/null || true
        fi
    done
    
    log_info "Cleanup completed"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command_exists node; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command_exists npm; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check if backend directory exists
    if [ ! -d "$API_ROOT" ]; then
        log_warning "Backend directory not found at $API_ROOT"
        log_warning "Backend will not be started automatically"
        SKIP_BACKEND=true
    elif ! command_exists uv; then
        log_warning "uv is not installed. Backend will not be started"
        log_warning "Install uv with: curl -LsSf https://astral.sh/uv/install.sh | sh"
        SKIP_BACKEND=true
    fi
    
    log_success "Prerequisites check completed"
}

# Start backend
start_backend() {
    if [ "$SKIP_BACKEND" = true ]; then
        log_warning "Skipping backend startup"
        return 0
    fi
    
    log_info "Starting backend..."
    
    if is_port_in_use 8000; then
        log_warning "Port 8000 is already in use. Backend might already be running."
        return 0
    fi
    
    cd "$API_ROOT"
    
    # Start backend in background
    nohup uv run fastapi dev > /tmp/mc-dashboard-backend.log 2>&1 &
    BACKEND_PID=$!
    
    log_info "Backend starting with PID $BACKEND_PID"
    
    # Wait for backend to start
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if is_port_in_use 8000; then
            log_success "Backend started successfully on http://localhost:8000"
            return 0
        fi
        
        log_info "Waiting for backend to start... ($attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    log_error "Backend failed to start within expected time"
    return 1
}

# Start frontend
start_frontend() {
    log_info "Starting frontend..."
    
    if is_port_in_use 3000; then
        log_warning "Port 3000 is already in use. Frontend might already be running."
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        log_info "Installing frontend dependencies..."
        npm install
    fi
    
    # Start frontend in background
    nohup npm run dev > /tmp/mc-dashboard-frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    log_info "Frontend starting with PID $FRONTEND_PID"
    
    # Wait for frontend to start
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if is_port_in_use 3000; then
            log_success "Frontend started successfully on http://localhost:3000"
            return 0
        fi
        
        log_info "Waiting for frontend to start... ($attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    log_error "Frontend failed to start within expected time"
    return 1
}

# Show logs
show_logs() {
    log_info "Showing service logs (Ctrl+C to stop)..."
    log_info "Backend logs: /tmp/mc-dashboard-backend.log"
    log_info "Frontend logs: /tmp/mc-dashboard-frontend.log"
    
    # Show logs in real-time
    if [ "$SKIP_BACKEND" != true ]; then
        tail -f /tmp/mc-dashboard-backend.log /tmp/mc-dashboard-frontend.log &
        TAIL_PID=$!
    else
        tail -f /tmp/mc-dashboard-frontend.log &
        TAIL_PID=$!
    fi
    
    # Wait for user interrupt
    wait
}

# Main function
main() {
    log_info "Starting MC Server Dashboard development environment..."
    
    # Initialize variables
    BACKEND_PID=""
    FRONTEND_PID=""
    TAIL_PID=""
    SKIP_BACKEND=false
    
    # Check prerequisites
    check_prerequisites
    
    # Start services
    start_backend
    start_frontend
    
    log_success "Development environment started successfully!"
    log_info "Frontend: http://localhost:3000"
    if [ "$SKIP_BACKEND" != true ]; then
        log_info "Backend API: http://localhost:8000"
        log_info "API Documentation: http://localhost:8000/docs"
    fi
    log_info ""
    log_info "Press Ctrl+C to stop all services"
    
    # Show logs and wait
    show_logs
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi