#!/bin/bash

# MC Server Dashboard Service Manager
# Unified management for both frontend and backend services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service names
FRONTEND_SERVICE="mc-dashboard-ui"
BACKEND_SERVICE="mc-dashboard-api"

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
    log_info "Service Status:"
    echo "----------------------------------------"
    
    local backend_status=$(get_service_status "$BACKEND_SERVICE")
    local frontend_status=$(get_service_status "$FRONTEND_SERVICE")
    
    printf "%-20s: " "Backend API"
    case $backend_status in
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
    
    printf "%-20s: " "Frontend UI"
    case $frontend_status in
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
    
    # Show URLs if services are running
    if [ "$backend_status" = "running" ]; then
        log_info "Backend API: http://localhost:8000"
        log_info "API Documentation: http://localhost:8000/docs"
    fi
    
    if [ "$frontend_status" = "running" ]; then
        log_info "Frontend UI: http://localhost:3000"
    fi
}

# Function to start services
start_services() {
    log_info "Starting services..."
    
    # Start backend first
    if service_exists "$BACKEND_SERVICE"; then
        local backend_status=$(get_service_status "$BACKEND_SERVICE")
        if [ "$backend_status" != "running" ]; then
            log_info "Starting backend service..."
            sudo systemctl start "$BACKEND_SERVICE"
            log_success "Backend service started"
        else
            log_info "Backend service is already running"
        fi
    else
        log_warning "Backend service not installed, skipping"
    fi
    
    # Start frontend
    if service_exists "$FRONTEND_SERVICE"; then
        local frontend_status=$(get_service_status "$FRONTEND_SERVICE")
        if [ "$frontend_status" != "running" ]; then
            log_info "Starting frontend service..."
            sudo systemctl start "$FRONTEND_SERVICE"
            log_success "Frontend service started"
        else
            log_info "Frontend service is already running"
        fi
    else
        log_error "Frontend service not installed"
        return 1
    fi
    
    log_success "All services started successfully"
}

# Function to stop services
stop_services() {
    log_info "Stopping services..."
    
    # Stop frontend first
    if service_exists "$FRONTEND_SERVICE"; then
        local frontend_status=$(get_service_status "$FRONTEND_SERVICE")
        if [ "$frontend_status" = "running" ]; then
            log_info "Stopping frontend service..."
            sudo systemctl stop "$FRONTEND_SERVICE"
            log_success "Frontend service stopped"
        else
            log_info "Frontend service is not running"
        fi
    fi
    
    # Stop backend
    if service_exists "$BACKEND_SERVICE"; then
        local backend_status=$(get_service_status "$BACKEND_SERVICE")
        if [ "$backend_status" = "running" ]; then
            log_info "Stopping backend service..."
            sudo systemctl stop "$BACKEND_SERVICE"
            log_success "Backend service stopped"
        else
            log_info "Backend service is not running"
        fi
    fi
    
    log_success "All services stopped"
}

# Function to restart services
restart_services() {
    log_info "Restarting services..."
    stop_services
    sleep 2
    start_services
}

# Function to show logs
show_logs() {
    local service="${1:-both}"
    
    case $service in
        "backend"|"api")
            if service_exists "$BACKEND_SERVICE"; then
                log_info "Showing backend logs (Ctrl+C to stop)..."
                sudo journalctl -u "$BACKEND_SERVICE" -f
            else
                log_error "Backend service not installed"
            fi
            ;;
        "frontend"|"ui")
            if service_exists "$FRONTEND_SERVICE"; then
                log_info "Showing frontend logs (Ctrl+C to stop)..."
                sudo journalctl -u "$FRONTEND_SERVICE" -f
            else
                log_error "Frontend service not installed"
            fi
            ;;
        "both"|*)
            if service_exists "$BACKEND_SERVICE" && service_exists "$FRONTEND_SERVICE"; then
                log_info "Showing all service logs (Ctrl+C to stop)..."
                sudo journalctl -u "$BACKEND_SERVICE" -u "$FRONTEND_SERVICE" -f
            elif service_exists "$FRONTEND_SERVICE"; then
                log_info "Showing frontend logs (Ctrl+C to stop)..."
                sudo journalctl -u "$FRONTEND_SERVICE" -f
            else
                log_error "No services are installed"
            fi
            ;;
    esac
}

# Function to enable services
enable_services() {
    log_info "Enabling services for auto-start..."
    
    if service_exists "$BACKEND_SERVICE"; then
        sudo systemctl enable "$BACKEND_SERVICE"
        log_success "Backend service enabled"
    else
        log_warning "Backend service not installed, skipping"
    fi
    
    if service_exists "$FRONTEND_SERVICE"; then
        sudo systemctl enable "$FRONTEND_SERVICE"
        log_success "Frontend service enabled"
    else
        log_error "Frontend service not installed"
        return 1
    fi
    
    log_success "All services enabled for auto-start"
}

# Function to disable services
disable_services() {
    log_info "Disabling services auto-start..."
    
    if service_exists "$FRONTEND_SERVICE"; then
        sudo systemctl disable "$FRONTEND_SERVICE"
        log_success "Frontend service disabled"
    fi
    
    if service_exists "$BACKEND_SERVICE"; then
        sudo systemctl disable "$BACKEND_SERVICE"
        log_success "Backend service disabled"
    fi
    
    log_success "All services disabled"
}

# Function to show help
show_help() {
    echo "MC Server Dashboard Service Manager"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  status              Show service status"
    echo "  start               Start all services"
    echo "  stop                Stop all services"
    echo "  restart             Restart all services"
    echo "  enable              Enable auto-start for all services"
    echo "  disable             Disable auto-start for all services"
    echo "  logs [SERVICE]      Show service logs"
    echo "  help                Show this help message"
    echo ""
    echo "Service options for logs command:"
    echo "  backend, api        Show only backend logs"
    echo "  frontend, ui        Show only frontend logs"
    echo "  both (default)      Show all service logs"
    echo ""
    echo "Examples:"
    echo "  $0 status           # Show current status"
    echo "  $0 start            # Start all services"
    echo "  $0 logs backend     # Show backend logs only"
    echo "  $0 logs             # Show all logs"
}

# Main function
main() {
    local command="${1:-status}"
    
    case $command in
        "status")
            show_status
            ;;
        "start")
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "enable")
            enable_services
            ;;
        "disable")
            disable_services
            ;;
        "logs")
            show_logs "$2"
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