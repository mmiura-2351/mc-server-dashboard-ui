#!/bin/bash

# MC Server Dashboard Frontend Development Start Script
# Starts frontend in development mode

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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
    log_info "Shutting down frontend..."
    
    # Kill frontend process
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        log_info "Stopping frontend process $FRONTEND_PID"
        kill "$FRONTEND_PID" 2>/dev/null || true
        
        # Wait a moment for process to stop
        sleep 2
        
        # Force kill if still running
        if kill -0 "$FRONTEND_PID" 2>/dev/null; then
            log_warning "Force killing frontend process $FRONTEND_PID"
            kill -9 "$FRONTEND_PID" 2>/dev/null || true
        fi
    fi
    
    # Kill tail process if running
    if [ -n "$TAIL_PID" ] && kill -0 "$TAIL_PID" 2>/dev/null; then
        kill "$TAIL_PID" 2>/dev/null || true
    fi
    
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
    
    # Check if backend is accessible (warning only)
    if ! curl -s http://localhost:8000/docs >/dev/null 2>&1; then
        log_warning "Backend API is not accessible at http://localhost:8000"
        log_warning "Make sure to start the backend separately before using the frontend"
        log_info "The frontend will start anyway, but API calls will fail"
    else
        log_success "Backend API is accessible"
    fi
    
    log_success "Prerequisites check completed"
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
    log_info "Showing frontend logs (Ctrl+C to stop)..."
    log_info "Frontend logs: /tmp/mc-dashboard-frontend.log"
    
    # Show logs in real-time
    tail -f /tmp/mc-dashboard-frontend.log &
    TAIL_PID=$!
    
    # Wait for user interrupt
    wait
}

# Main function
main() {
    log_info "Starting MC Server Dashboard Frontend development environment..."
    
    # Initialize variables
    FRONTEND_PID=""
    TAIL_PID=""
    
    # Check prerequisites
    check_prerequisites
    
    # Start frontend
    start_frontend
    
    log_success "Frontend development environment started successfully!"
    log_info "Frontend: http://localhost:3000"
    log_info ""
    log_info "Press Ctrl+C to stop the frontend"
    
    # Show logs and wait
    show_logs
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi