#!/bin/bash

# MC Server Dashboard Frontend Update Script
# Automated application update with git pull and deployment

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_SCRIPT="$SCRIPT_DIR/deploy.sh"
UPDATE_LOG_DIR="/tmp"
UPDATE_LOG_FILE="$UPDATE_LOG_DIR/mc-dashboard-update-$(date +%Y%m%d-%H%M%S).log"
UPDATE_HISTORY_FILE="/tmp/mc-dashboard-update-history.json"
BACKUP_DIR="/tmp/mc-dashboard-backups"
BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup-$BACKUP_TIMESTAMP"
ROLLBACK_INFO_FILE="$BACKUP_PATH/rollback-info.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    local message="$1"
    echo -e "${BLUE}[INFO]${NC} $message"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $message" >> "$UPDATE_LOG_FILE"
}

log_success() {
    local message="$1"
    echo -e "${GREEN}[SUCCESS]${NC} $message"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $message" >> "$UPDATE_LOG_FILE"
}

log_warning() {
    local message="$1"
    echo -e "${YELLOW}[WARNING]${NC} $message"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $message" >> "$UPDATE_LOG_FILE"
}

log_error() {
    local message="$1"
    echo -e "${RED}[ERROR]${NC} $message"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $message" >> "$UPDATE_LOG_FILE"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check git
    if ! command_exists git; then
        log_error "Git is not installed. Please install git first."
        exit 1
    fi
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        log_error "Not in a git repository. Please run from the project root directory."
        exit 1
    fi
    
    # Check if deploy script exists
    if [[ ! -x "$DEPLOY_SCRIPT" ]]; then
        log_error "Deploy script not found or not executable: $DEPLOY_SCRIPT"
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

# Function to check for uncommitted changes
check_git_status() {
    log_info "Checking git status..."
    
    if ! git diff-index --quiet HEAD --; then
        log_warning "You have uncommitted changes in your working directory:"
        git status --porcelain
        echo ""
        log_warning "These changes may be lost during the update."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Update cancelled by user"
            exit 0
        fi
    fi
    
    log_success "Git status check completed"
}

# Function to fetch latest updates
fetch_updates() {
    log_info "Fetching latest updates from remote..."
    
    if ! git fetch origin; then
        log_error "Failed to fetch updates from remote repository"
        exit 1
    fi
    
    log_success "Remote updates fetched successfully"
}

# Function to check if updates are available
check_updates_available() {
    log_info "Checking for available updates..."
    
    local current_commit=$(git rev-parse HEAD)
    local remote_commit=$(git rev-parse origin/$(git rev-parse --abbrev-ref HEAD))
    
    if [[ "$current_commit" == "$remote_commit" ]]; then
        log_info "Already up to date. No updates available."
        return 1
    fi
    
    local commits_behind=$(git rev-list --count HEAD..origin/$(git rev-parse --abbrev-ref HEAD))
    log_info "Found $commits_behind new commit(s) available for update"
    
    # Show update summary
    echo ""
    log_info "Update summary:"
    git log --oneline HEAD..origin/$(git rev-parse --abbrev-ref HEAD)
    echo ""
    
    return 0
}

# Function to perform git pull
perform_git_pull() {
    log_info "Pulling latest changes..."
    
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    
    if ! git pull origin "$current_branch"; then
        log_error "Failed to pull changes from remote repository"
        log_error "You may need to resolve conflicts manually"
        exit 1
    fi
    
    log_success "Successfully pulled latest changes"
}

# Function to create backup
create_backup() {
    if [[ "$CREATE_BACKUP" != true ]]; then
        return 0
    fi
    
    log_info "Creating backup before update..."
    
    # Create backup directory
    mkdir -p "$BACKUP_PATH"
    
    # Record current state
    local current_commit=$(git rev-parse HEAD)
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    local backup_timestamp=$(date -Iseconds)
    
    # Create rollback information file
    cat > "$ROLLBACK_INFO_FILE" << EOF
{
    "backup_timestamp": "$backup_timestamp",
    "git_commit": "$current_commit",
    "git_branch": "$current_branch",
    "project_root": "$PROJECT_ROOT",
    "backup_path": "$BACKUP_PATH"
}
EOF
    
    # Backup critical files
    log_info "Backing up critical configuration files..."
    cp -r "$PROJECT_ROOT/.env"* "$BACKUP_PATH/" 2>/dev/null || true
    cp "$PROJECT_ROOT/package.json" "$BACKUP_PATH/" 2>/dev/null || true
    cp "$PROJECT_ROOT/package-lock.json" "$BACKUP_PATH/" 2>/dev/null || true
    
    # Save git patch of uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        log_info "Saving uncommitted changes..."
        git diff > "$BACKUP_PATH/uncommitted-changes.patch"
    fi
    
    log_success "Backup created at: $BACKUP_PATH"
    echo "$BACKUP_PATH" > "/tmp/mc-dashboard-last-backup"
}

# Function to check for dependency changes
check_dependency_changes() {
    log_info "Checking for dependency changes..."
    
    local has_dependency_changes=false
    
    # Check if package.json was modified
    if git diff --name-only HEAD~1 HEAD | grep -q "package.json"; then
        log_warning "Package configuration changed (package.json)"
        has_dependency_changes=true
    fi
    
    # Check if package-lock.json was modified
    if git diff --name-only HEAD~1 HEAD | grep -q "package-lock.json"; then
        log_warning "Dependency lockfile changed (package-lock.json)"
        has_dependency_changes=true
    fi
    
    # Check for .env changes
    if git diff --name-only HEAD~1 HEAD | grep -q ".env"; then
        log_warning "Environment configuration files changed"
    fi
    
    if [[ "$has_dependency_changes" == true ]]; then
        log_warning "Dependencies have been updated - the deployment script will reinstall automatically"
        log_info "This may take longer than usual due to dependency installation"
    else
        log_info "No dependency changes detected"
    fi
    
    # Return status for history tracking
    return $([ "$has_dependency_changes" == true ] && echo 1 || echo 0)
}

# Function to record update history
record_update_history() {
    local status="$1"
    local start_time="$2"
    local end_time="$(date -Iseconds)"
    local git_from="$3"
    local git_to="$4"
    local has_backup="$5"
    local dependency_changes="$6"
    
    log_info "Recording update history..."
    
    # Create history file if it doesn't exist
    if [[ ! -f "$UPDATE_HISTORY_FILE" ]]; then
        echo "[]" > "$UPDATE_HISTORY_FILE"
    fi
    
    # Create history entry
    local history_entry=$(cat << EOF
{
    "timestamp": "$end_time",
    "start_time": "$start_time",
    "end_time": "$end_time",
    "status": "$status",
    "git_from": "$git_from",
    "git_to": "$git_to",
    "project_root": "$PROJECT_ROOT",
    "log_file": "$UPDATE_LOG_FILE",
    "backup_created": $has_backup,
    "backup_path": "${has_backup:+$BACKUP_PATH}",
    "dependency_changes": $dependency_changes,
    "node_version": "$(node --version 2>/dev/null || echo 'unknown')",
    "npm_version": "$(npm --version 2>/dev/null || echo 'unknown')",
    "user": "$USER",
    "hostname": "$(hostname)",
    "options": {
        "check_only": $CHECK_ONLY,
        "force_update": $FORCE_UPDATE,
        "create_backup": $CREATE_BACKUP,
        "rollback_mode": $ROLLBACK_MODE
    }
}
EOF
    )
    
    # Add entry to history file
    local temp_file=$(mktemp)
    jq ". += [$history_entry]" "$UPDATE_HISTORY_FILE" > "$temp_file" 2>/dev/null || {
        # Fallback if jq is not available
        local current_content=$(cat "$UPDATE_HISTORY_FILE")
        if [[ "$current_content" == "[]" ]]; then
            echo "[$history_entry]" > "$temp_file"
        else
            echo "${current_content%]}, $history_entry]" > "$temp_file"
        fi
    }
    
    mv "$temp_file" "$UPDATE_HISTORY_FILE"
    log_success "Update history recorded"
}

# Function to show update history
show_update_history() {
    if [[ ! -f "$UPDATE_HISTORY_FILE" ]]; then
        log_info "No update history found"
        return 0
    fi
    
    log_info "Recent update history:"
    echo "===================="
    
    # Show last 5 updates
    if command_exists jq; then
        jq -r '.[-5:] | .[] | "\(.timestamp): \(.status) (\(.git_from[0:7])..\(.git_to[0:7]))"' "$UPDATE_HISTORY_FILE" 2>/dev/null || {
            log_warning "Could not parse history file"
        }
    else
        log_warning "jq not available - showing raw history file"
        tail -n 10 "$UPDATE_HISTORY_FILE"
    fi
}

# Function to cleanup old backups and logs
cleanup_old_files() {
    log_info "Cleaning up old files..."
    
    # Clean up old backups (keep last 5)
    if [[ -d "$BACKUP_DIR" ]]; then
        local backup_count=$(find "$BACKUP_DIR" -name "backup-*" -type d | wc -l)
        if [[ $backup_count -gt 5 ]]; then
            log_info "Removing old backups (keeping 5 most recent)"
            find "$BACKUP_DIR" -name "backup-*" -type d | sort | head -n -5 | xargs rm -rf
        fi
    fi
    
    # Clean up old log files (keep last 10)
    local log_count=$(find "$UPDATE_LOG_DIR" -name "mc-dashboard-update-*.log" | wc -l)
    if [[ $log_count -gt 10 ]]; then
        log_info "Removing old log files (keeping 10 most recent)"
        find "$UPDATE_LOG_DIR" -name "mc-dashboard-update-*.log" | sort | head -n -10 | xargs rm -f
    fi
    
    log_success "Cleanup completed"
}

# Function to perform enhanced health check
enhanced_health_check() {
    log_info "Performing enhanced health check..."
    
    # Check if service is running
    if ! systemctl is-active --quiet mc-dashboard-ui 2>/dev/null; then
        log_error "Service is not running after update"
        return 1
    fi
    
    # Check if frontend is responding
    local max_attempts=20
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3000 >/dev/null 2>&1; then
            log_success "Frontend is responding"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Frontend is not responding after $max_attempts attempts"
            return 1
        fi
        
        log_info "Attempt $attempt/$max_attempts: Waiting for frontend..."
        sleep 3
        ((attempt++))
    done
    
    # Check if backend is accessible (warning only)
    if curl -s http://localhost:8000/docs >/dev/null 2>&1; then
        log_success "Backend API is accessible"
    else
        log_warning "Backend API is not accessible - this may be expected if backend is managed separately"
    fi
    
    log_success "Enhanced health check completed"
    return 0
}

# Function to rollback changes
rollback_update() {
    local backup_path="$1"
    
    if [[ -z "$backup_path" ]]; then
        log_error "No backup path provided for rollback"
        return 1
    fi
    
    if [[ ! -d "$backup_path" ]]; then
        log_error "Backup directory not found: $backup_path"
        return 1
    fi
    
    log_warning "Rolling back update..."
    
    # Read rollback information
    if [[ -f "$backup_path/rollback-info.json" ]]; then
        local git_commit=$(grep '"git_commit"' "$backup_path/rollback-info.json" | cut -d'"' -f4)
        
        if [[ -n "$git_commit" ]]; then
            log_info "Rolling back to git commit: $git_commit"
            git reset --hard "$git_commit"
            
            # Restore uncommitted changes if they exist
            if [[ -f "$backup_path/uncommitted-changes.patch" ]]; then
                log_info "Restoring uncommitted changes..."
                git apply "$backup_path/uncommitted-changes.patch" || log_warning "Could not restore all uncommitted changes"
            fi
        fi
    fi
    
    # Restore configuration files
    log_info "Restoring configuration files..."
    cp "$backup_path"/.env* "$PROJECT_ROOT/" 2>/dev/null || true
    
    # Re-run deployment after rollback
    log_info "Re-deploying after rollback..."
    if "$DEPLOY_SCRIPT"; then
        log_success "Rollback completed successfully"
        return 0
    else
        log_error "Rollback deployment failed"
        return 1
    fi
}

# Function to run deployment with rollback on failure
run_deployment() {
    log_info "Starting deployment process..."
    
    if ! "$DEPLOY_SCRIPT"; then
        log_error "Deployment failed"
        
        # Record failed update in history
        local git_from_commit="$ORIGINAL_COMMIT"
        local git_to_commit=$(git rev-parse HEAD)
        record_update_history "deployment_failed" "$UPDATE_START_TIME" "$git_from_commit" "$git_to_commit" "$CREATE_BACKUP" "$DEPENDENCY_CHANGES_DETECTED"
        
        # Attempt rollback if backup was created
        if [[ "$CREATE_BACKUP" == true && -d "$BACKUP_PATH" ]]; then
            log_warning "Attempting automatic rollback due to deployment failure..."
            if rollback_update "$BACKUP_PATH"; then
                log_warning "Rollback completed. System restored to previous state."
                record_update_history "rollback_success" "$UPDATE_START_TIME" "$git_from_commit" "$ORIGINAL_COMMIT" "$CREATE_BACKUP" "$DEPENDENCY_CHANGES_DETECTED"
                exit 1
            else
                log_error "Rollback failed. Manual intervention required."
                log_error "Backup location: $BACKUP_PATH"
                record_update_history "rollback_failed" "$UPDATE_START_TIME" "$git_from_commit" "$git_to_commit" "$CREATE_BACKUP" "$DEPENDENCY_CHANGES_DETECTED"
                exit 1
            fi
        else
            exit 1
        fi
    fi
    
    log_success "Deployment completed successfully"
    
    # Perform enhanced health check after deployment
    if ! enhanced_health_check; then
        log_error "Health check failed after deployment"
        
        # Record health check failure in history
        local git_from_commit="$ORIGINAL_COMMIT"
        local git_to_commit=$(git rev-parse HEAD)
        record_update_history "health_check_failed" "$UPDATE_START_TIME" "$git_from_commit" "$git_to_commit" "$CREATE_BACKUP" "$DEPENDENCY_CHANGES_DETECTED"
        
        # Attempt rollback if backup was created
        if [[ "$CREATE_BACKUP" == true && -d "$BACKUP_PATH" ]]; then
            log_warning "Attempting automatic rollback due to health check failure..."
            if rollback_update "$BACKUP_PATH"; then
                log_warning "Rollback completed. System restored to previous state."
                record_update_history "rollback_success" "$UPDATE_START_TIME" "$git_from_commit" "$ORIGINAL_COMMIT" "$CREATE_BACKUP" "$DEPENDENCY_CHANGES_DETECTED"
                exit 1
            else
                log_error "Rollback failed. Manual intervention required."
                log_error "Backup location: $BACKUP_PATH"
                record_update_history "rollback_failed" "$UPDATE_START_TIME" "$git_from_commit" "$git_to_commit" "$CREATE_BACKUP" "$DEPENDENCY_CHANGES_DETECTED"
                exit 1
            fi
        else
            exit 1
        fi
    fi
}

# Function to show help
show_help() {
    echo "MC Server Dashboard Frontend Update Script"
    echo ""
    echo "This script automates the application update process by:"
    echo "1. Checking for git updates"
    echo "2. Creating backup (optional)"
    echo "3. Pulling latest changes"
    echo "4. Running the deployment script"
    echo "5. Performing health checks"
    echo "6. Automatic rollback on failure (if backup enabled)"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --check              Check for updates without applying them"
    echo "  --backup             Create backup before update (enables auto-rollback)"
    echo "  --rollback [PATH]    Rollback to previous version using backup"
    echo "  --force              Force update even with uncommitted changes"
    echo "  --history            Show recent update history"
    echo "  --dependencies       Check for dependency changes only"
    echo "  --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                        # Standard update"
    echo "  $0 --check               # Check for updates only"
    echo "  $0 --backup              # Safe update with backup"
    echo "  $0 --rollback            # Rollback using last backup"
    echo "  $0 --rollback /path      # Rollback using specific backup"
    echo "  $0 --backup --force      # Force update with backup"
    echo "  $0 --history             # Show update history"
    echo "  $0 --dependencies        # Check dependency changes"
    echo ""
    echo "Log file: $UPDATE_LOG_FILE"
    echo "Backup directory: $BACKUP_DIR"
    echo ""
    echo "Note: This script requires git and the deployment script to be available."
    echo "      The --backup option provides automatic rollback on deployment failure."
}

# Function to parse command line arguments
parse_arguments() {
    CHECK_ONLY=false
    FORCE_UPDATE=false
    CREATE_BACKUP=false
    ROLLBACK_MODE=false
    ROLLBACK_PATH=""
    SHOW_HISTORY=false
    CHECK_DEPENDENCIES_ONLY=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --check)
                CHECK_ONLY=true
                shift
                ;;
            --backup)
                CREATE_BACKUP=true
                shift
                ;;
            --rollback)
                ROLLBACK_MODE=true
                if [[ -n "$2" && "$2" != --* ]]; then
                    ROLLBACK_PATH="$2"
                    shift
                else
                    # Use last backup if no path specified
                    if [[ -f "/tmp/mc-dashboard-last-backup" ]]; then
                        ROLLBACK_PATH=$(cat "/tmp/mc-dashboard-last-backup")
                    fi
                fi
                shift
                ;;
            --force)
                FORCE_UPDATE=true
                shift
                ;;
            --history)
                SHOW_HISTORY=true
                shift
                ;;
            --dependencies)
                CHECK_DEPENDENCIES_ONLY=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Main update function
main() {
    # Initialize log file
    mkdir -p "$UPDATE_LOG_DIR"
    echo "MC Server Dashboard Update Log - $(date)" > "$UPDATE_LOG_FILE"
    echo "=======================================" >> "$UPDATE_LOG_FILE"
    
    log_info "Starting MC Server Dashboard Frontend update..."
    log_info "Project root: $PROJECT_ROOT"
    log_info "Log file: $UPDATE_LOG_FILE"
    
    # Record start time and initial state for history tracking
    UPDATE_START_TIME=$(date -Iseconds)
    ORIGINAL_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    DEPENDENCY_CHANGES_DETECTED=false
    
    # Parse command line arguments
    parse_arguments "$@"
    
    # Handle history mode
    if [[ "$SHOW_HISTORY" == true ]]; then
        show_update_history
        exit 0
    fi
    
    # Handle dependencies check only
    if [[ "$CHECK_DEPENDENCIES_ONLY" == true ]]; then
        check_prerequisites
        fetch_updates
        if check_updates_available; then
            check_dependency_changes
        fi
        exit 0
    fi
    
    # Handle rollback mode
    if [[ "$ROLLBACK_MODE" == true ]]; then
        log_info "Rollback mode activated"
        if [[ -z "$ROLLBACK_PATH" ]]; then
            log_error "No backup path specified and no last backup found"
            log_info "Use: $0 --rollback /path/to/backup"
            exit 1
        fi
        
        log_info "Rolling back using backup: $ROLLBACK_PATH"
        if rollback_update "$ROLLBACK_PATH"; then
            log_success "Rollback completed successfully"
            exit 0
        else
            log_error "Rollback failed"
            exit 1
        fi
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Check git status (skip if force update)
    if [[ "$FORCE_UPDATE" != true ]]; then
        check_git_status
    fi
    
    # Fetch updates
    fetch_updates
    
    # Check if updates are available
    if ! check_updates_available; then
        log_success "Update check completed - already up to date"
        exit 0
    fi
    
    # If check only mode, exit here
    if [[ "$CHECK_ONLY" == true ]]; then
        log_info "Check-only mode: Updates are available but not applied"
        log_info "Run without --check to apply updates"
        exit 0
    fi
    
    # Create backup if requested
    create_backup
    
    # Perform git pull
    perform_git_pull
    
    # Check for dependency changes
    check_dependency_changes
    DEPENDENCY_CHANGES_DETECTED=$?
    
    # Run deployment
    run_deployment
    
    # Record successful update in history
    local git_from_commit="$ORIGINAL_COMMIT"
    local git_to_commit=$(git rev-parse HEAD)
    record_update_history "success" "$UPDATE_START_TIME" "$git_from_commit" "$git_to_commit" "$CREATE_BACKUP" "$DEPENDENCY_CHANGES_DETECTED"
    
    # Cleanup old files
    cleanup_old_files
    
    log_success "Update completed successfully!"
    log_info "Log file saved: $UPDATE_LOG_FILE"
    
    echo ""
    log_info "Application should now be running with the latest version"
    log_info "Frontend URL: http://localhost:3000"
    log_info "You can check the service status with: scripts/service-manager.sh status"
    log_info "View update history with: scripts/update.sh --history"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi