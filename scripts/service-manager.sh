#!/bin/bash

# MC Server Dashboard Frontend Service Manager
# Management for frontend service only

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service name
SERVICE_NAME="mc-dashboard-ui"

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

# Function to check if service exists
service_exists() {
    systemctl list-unit-files "$1.service" >/dev/null 2>&1
}

# Function to get service status
get_service_status() {
    if service_exists "$1"; then
        if systemctl is-active --quiet "$1"; then
            echo "running"
        elif systemctl is-enabled --quiet "$1"; then
            echo "stopped"
        else
            echo "disabled"
        fi
    else
        echo "not_installed"
    fi
}

# Function to show service status
show_status() {
    log_info "Frontend Service Status:"
    echo "----------------------------------------"
    
    local status=$(get_service_status "$SERVICE_NAME")
    
    printf "%-20s: " "Frontend UI"
    case $status in
        "running")
            echo -e "${GREEN}Running${NC}"
            ;;
        "stopped")
            echo -e "${YELLOW}Stopped${NC}"
            ;;
        "disabled")
            echo -e "${RED}Disabled${NC}"
            ;;
        "not_installed")
            echo -e "${RED}Not Installed${NC}"
            ;;
    esac
    
    echo "----------------------------------------"
    
    # Show URL if service is running
    if [ "$status" = "running" ]; then
        log_info "Frontend URL: http://localhost:3000"
    fi
    
    # Check backend status (informational only)
    echo ""
    log_info "Backend API Status (informational):"
    if curl -s http://localhost:8000/docs >/dev/null 2>&1; then
        echo -e "Backend API: ${GREEN}Accessible${NC} at http://localhost:8000"
    else
        echo -e "Backend API: ${YELLOW}Not accessible${NC} at http://localhost:8000"
        log_warning "Make sure the backend is running separately"
    fi
}

# Function to start service
start_service() {
    log_info "Starting frontend service..."
    
    if service_exists "$SERVICE_NAME"; then
        local status=$(get_service_status "$SERVICE_NAME")
        if [ "$status" != "running" ]; then
            log_info "Starting service..."
            sudo systemctl start "$SERVICE_NAME"
            log_success "Frontend service started"
        else
            log_info "Frontend service is already running"
        fi
    else
        log_error "Frontend service not installed"
        log_info "Install it with:"
        log_info "  sudo cp /opt/mcs-dashboard/ui/deployment/mc-dashboard-ui.service /etc/systemd/system/"
        log_info "  sudo systemctl daemon-reload"
        log_info "  sudo systemctl enable mc-dashboard-ui"
        return 1
    fi
}

# Function to stop service
stop_service() {
    log_info "Stopping frontend service..."
    
    if service_exists "$SERVICE_NAME"; then
        local status=$(get_service_status "$SERVICE_NAME")
        if [ "$status" = "running" ]; then
            log_info "Stopping service..."
            sudo systemctl stop "$SERVICE_NAME"
            log_success "Frontend service stopped"
        else
            log_info "Frontend service is not running"
        fi
    else
        log_warning "Frontend service not installed"
    fi
}

# Function to restart service
restart_service() {
    log_info "Restarting frontend service..."
    stop_service
    sleep 2
    start_service
}

# Function to show logs
show_logs() {
    if service_exists "$SERVICE_NAME"; then
        log_info "Showing frontend logs (Ctrl+C to stop)..."
        sudo journalctl -u "$SERVICE_NAME" -f
    else
        log_error "Frontend service not installed"
    fi
}

# Function to enable service
enable_service() {
    log_info "Enabling frontend service for auto-start..."
    
    if service_exists "$SERVICE_NAME"; then
        sudo systemctl enable "$SERVICE_NAME"
        log_success "Frontend service enabled for auto-start"
    else
        log_error "Frontend service not installed"
        return 1
    fi
}

# Function to disable service
disable_service() {
    log_info "Disabling frontend service auto-start..."
    
    if service_exists "$SERVICE_NAME"; then
        sudo systemctl disable "$SERVICE_NAME"
        log_success "Frontend service disabled"
    else
        log_warning "Frontend service not installed"
    fi
}

# Function to show help
show_help() {
    echo "MC Server Dashboard Frontend Service Manager"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  status              Show frontend service status"
    echo "  start               Start frontend service"
    echo "  stop                Stop frontend service"
    echo "  restart             Restart frontend service"
    echo "  enable              Enable auto-start for frontend service"
    echo "  disable             Disable auto-start for frontend service"
    echo "  logs                Show frontend service logs"
    echo "  help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status           # Show current status"
    echo "  $0 start            # Start frontend service"
    echo "  $0 logs             # Show frontend logs"
    echo ""
    echo "Note: The backend API should be managed separately."
}

# Main function
main() {
    local command="${1:-status}"
    
    case $command in
        "status")
            show_status
            ;;
        "start")
            start_service
            ;;
        "stop")
            stop_service
            ;;
        "restart")
            restart_service
            ;;
        "enable")
            enable_service
            ;;
        "disable")
            disable_service
            ;;
        "logs")
            show_logs
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi