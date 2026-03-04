#!/bin/bash

# start.sh - Main script to run all services
# Telegram MiniApp Project

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$PROJECT_DIR/venv"
LOG_DIR="$PROJECT_DIR/logs"
PID_DIR="$PROJECT_DIR/pids"
FLASK_PORT=4000
FLASK_HOST="127.0.0.1"

# Create necessary directories
mkdir -p "$LOG_DIR"
mkdir -p "$PID_DIR"

# Log files
FLASK_LOG="$LOG_DIR/flask.log"
BOT_LOG="$LOG_DIR/bot.log"
TUNNEL_LOG="$LOG_DIR/tunnel.log"
MAIN_LOG="$LOG_DIR/main.log"

# PID files
FLASK_PID="$PID_DIR/flask.pid"
BOT_PID="$PID_DIR/bot.pid"
TUNNEL_PID="$PID_DIR/tunnel.pid"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%H:%M:%S')]${NC} $message"
}

# Function to check if a process is running
is_running() {
    local pid_file=$1
    local process_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            return 0  # Running
        fi
    fi
    return 1  # Not running
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0  # Port in use
    else
        return 1  # Port free
    fi
}

# Function to check dependencies
check_dependencies() {
    print_status "$YELLOW" "Checking dependencies..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_status "$RED" "Python3 is not installed. Please install Python3 first."
        exit 1
    fi
    
    # Check pip
    if ! command -v pip3 &> /dev/null; then
        print_status "$RED" "pip3 is not installed. Please install pip3 first."
        exit 1
    fi
    
    # Check virtualenv
    if ! command -v virtualenv &> /dev/null; then
        print_status "$YELLOW" "virtualenv not found. Installing..."
        pip3 install virtualenv
    fi
    
    # Check cloudflared
    if ! command -v cloudflared &> /dev/null; then
        print_status "$YELLOW" "cloudflared not found. Please install cloudflared first."
        print_status "$YELLOW" "Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
        exit 1
    fi
    
    # Check lsof
    if ! command -v lsof &> /dev/null; then
        print_status "$YELLOW" "lsof not found. Installing..."
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get install -y lsof
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew install lsof
        fi
    fi
    
    print_status "$GREEN" "All dependencies are installed."
}

# Function to setup virtual environment
setup_venv() {
    print_status "$YELLOW" "Setting up virtual environment..."
    
    if [ ! -d "$VENV_DIR" ]; then
        virtualenv -p python3 "$VENV_DIR"
        print_status "$GREEN" "Virtual environment created."
    fi
    
    # Activate virtual environment and install requirements
    source "$VENV_DIR/bin/activate"
    
    if [ -f "$PROJECT_DIR/requirements.txt" ]; then
        print_status "$YELLOW" "Installing Python dependencies..."
        pip install -r "$PROJECT_DIR/requirements.txt"
        print_status "$GREEN" "Dependencies installed."
    else
        print_status "$RED" "requirements.txt not found!"
        exit 1
    fi
    
    deactivate
}

# Function to load environment variables
load_env() {
    if [ -f "$PROJECT_DIR/.env" ]; then
        set -a
        source "$PROJECT_DIR/.env"
        set +a
        print_status "$GREEN" "Environment variables loaded from .env"
    else
        print_status "$RED" ".env file not found! Please create one from .env.example"
        exit 1
    fi
}

# Function to start Flask backend
start_flask() {
    print_status "$YELLOW" "Starting Flask backend..."
    
    if is_running "$FLASK_PID" "flask"; then
        print_status "$YELLOW" "Flask is already running (PID: $(cat $FLASK_PID))"
        return 0
    fi
    
    if check_port $FLASK_PORT; then
        print_status "$RED" "Port $FLASK_PORT is already in use!"
        print_status "$YELLOW" "Please free the port and try again."
        return 1
    fi
    
    source "$VENV_DIR/bin/activate"
    
    cd "$PROJECT_DIR/services"
    
    # Start Flask in background
    nohup python service_default.py > "$FLASK_LOG" 2>&1 &
    local pid=$!
    echo $pid > "$FLASK_PID"
    
    cd "$PROJECT_DIR"
    
    deactivate
    
    # Wait for Flask to start
    sleep 3
    
    if is_running "$FLASK_PID" "flask"; then
        print_status "$GREEN" "Flask backend started successfully (PID: $pid)"
        print_status "$GREEN" "Log file: $FLASK_LOG"
        return 0
    else
        print_status "$RED" "Failed to start Flask backend!"
        return 1
    fi
}

# Function to start Telegram bot
start_bot() {
    print_status "$YELLOW" "Starting Telegram bot..."
    
    if is_running "$BOT_PID" "bot"; then
        print_status "$YELLOW" "Telegram bot is already running (PID: $(cat $BOT_PID))"
        return 0
    fi
    
    source "$VENV_DIR/bin/activate"
    
    cd "$PROJECT_DIR"
    
    # Start bot in background
    nohup python b.py > "$BOT_LOG" 2>&1 &
    local pid=$!
    echo $pid > "$BOT_PID"
    
    cd "$PROJECT_DIR"
    
    deactivate
    
    # Wait for bot to start
    sleep 2
    
    if is_running "$BOT_PID" "bot"; then
        print_status "$GREEN" "Telegram bot started successfully (PID: $pid)"
        print_status "$GREEN" "Log file: $BOT_LOG"
        return 0
    else
        print_status "$RED" "Failed to start Telegram bot!"
        return 1
    fi
}

# Function to start Cloudflared tunnel
start_tunnel() {
    print_status "$YELLOW" "Starting Cloudflared tunnel..."
    
    if is_running "$TUNNEL_PID" "cloudflared"; then
        print_status "$YELLOW" "Cloudflared tunnel is already running (PID: $(cat $TUNNEL_PID))"
        return 0
    fi
    
    # Check if Flask is running
    if ! is_running "$FLASK_PID" "flask"; then
        print_status "$RED" "Flask is not running! Please start Flask first."
        return 1
    fi
    
    # Start cloudflared tunnel
    nohup cloudflared tunnel --url http://$FLASK_HOST:$FLASK_PORT > "$TUNNEL_LOG" 2>&1 &
    local pid=$!
    echo $pid > "$TUNNEL_PID"
    
    # Wait for tunnel to establish
    sleep 5
    
    if is_running "$TUNNEL_PID" "cloudflared"; then
        # Extract tunnel URL from log
        local tunnel_url=$(grep -o 'https://[^ ]*\.trycloudflare\.com' "$TUNNEL_LOG" | head -1)
        
        if [ ! -z "$tunnel_url" ]; then
            print_status "$GREEN" "Cloudflared tunnel started successfully (PID: $pid)"
            print_status "$GREEN" "Tunnel URL: $tunnel_url"
            print_status "$GREEN" "Log file: $TUNNEL_LOG"
            
            # Update .env with new tunnel URL
            sed -i.bak "s|TUNNEL_URL=.*|TUNNEL_URL=$tunnel_url|" "$PROJECT_DIR/.env"
            rm -f "$PROJECT_DIR/.env.bak"
            
            # Update config.js with new tunnel URL
            if [ -f "$PROJECT_DIR/config.js" ]; then
                sed -i.bak "s|API_BASE_URL:.*|API_BASE_URL: '$tunnel_url',|" "$PROJECT_DIR/config.js"
                rm -f "$PROJECT_DIR/config.js.bak"
            fi
            
            print_status "$GREEN" "Updated .env and config.js with new tunnel URL"
        else
            print_status "$YELLOW" "Tunnel started but URL not yet available. Check logs later."
        fi
        
        return 0
    else
        print_status "$RED" "Failed to start Cloudflared tunnel!"
        return 1
    fi
}

# Function to stop a service
stop_service() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            print_status "$YELLOW" "Stopping $service_name (PID: $pid)..."
            kill "$pid"
            sleep 2
            if kill -0 "$pid" 2>/dev/null; then
                print_status "$YELLOW" "Force stopping $service_name..."
                kill -9 "$pid" 2>/dev/null
            fi
            rm -f "$pid_file"
            print_status "$GREEN" "$service_name stopped"
        else
            print_status "$YELLOW" "$service_name is not running"
            rm -f "$pid_file"
        fi
    else
        print_status "$YELLOW" "$service_name is not running"
    fi
}

# Function to stop all services
stop_all() {
    print_status "$YELLOW" "Stopping all services..."
    
    stop_service "$TUNNEL_PID" "Cloudflared tunnel"
    stop_service "$BOT_PID" "Telegram bot"
    stop_service "$FLASK_PID" "Flask backend"
    
    print_status "$GREEN" "All services stopped"
}

# Function to show status
show_status() {
    print_status "$BLUE" "=== Service Status ==="
    
    # Flask status
    if is_running "$FLASK_PID" "flask"; then
        print_status "$GREEN" "Flask backend: RUNNING (PID: $(cat $FLASK_PID))"
    else
        print_status "$RED" "Flask backend: STOPPED"
    fi
    
    # Bot status
    if is_running "$BOT_PID" "bot"; then
        print_status "$GREEN" "Telegram bot: RUNNING (PID: $(cat $BOT_PID))"
    else
        print_status "$RED" "Telegram bot: STOPPED"
    fi
    
    # Tunnel status
    if is_running "$TUNNEL_PID" "cloudflared"; then
        print_status "$GREEN" "Cloudflared tunnel: RUNNING (PID: $(cat $TUNNEL_PID))"
        
        # Show tunnel URL if available
        local tunnel_url=$(grep -o 'https://[^ ]*\.trycloudflare\.com' "$TUNNEL_LOG" | tail -1)
        if [ ! -z "$tunnel_url" ]; then
            print_status "$CYAN" "Tunnel URL: $tunnel_url"
        fi
    else
        print_status "$RED" "Cloudflared tunnel: STOPPED"
    fi
    
    # Port status
    if check_port $FLASK_PORT; then
        print_status "$GREEN" "Port $FLASK_PORT: IN USE"
    else
        print_status "$RED" "Port $FLASK_PORT: FREE"
    fi
}

# Function to show logs
show_logs() {
    local service=$1
    
    case $service in
        flask)
            tail -f "$FLASK_LOG"
            ;;
        bot)
            tail -f "$BOT_LOG"
            ;;
        tunnel)
            tail -f "$TUNNEL_LOG"
            ;;
        all)
            tail -f "$FLASK_LOG" "$BOT_LOG" "$TUNNEL_LOG"
            ;;
        *)
            print_status "$RED" "Unknown service: $service"
            print_status "$YELLOW" "Available: flask, bot, tunnel, all"
            exit 1
            ;;
    esac
}

# Function to restart services
restart_service() {
    local service=$1
    
    case $service in
        flask)
            stop_service "$FLASK_PID" "Flask backend"
            sleep 2
            start_flask
            ;;
        bot)
            stop_service "$BOT_PID" "Telegram bot"
            sleep 2
            start_bot
            ;;
        tunnel)
            stop_service "$TUNNEL_PID" "Cloudflared tunnel"
            sleep 2
            start_tunnel
            ;;
        all)
            stop_all
            sleep 3
            start_flask && start_bot && start_tunnel
            ;;
        *)
            print_status "$RED" "Unknown service: $service"
            print_status "$YELLOW" "Available: flask, bot, tunnel, all"
            exit 1
            ;;
    esac
}

# Function to show help
show_help() {
    echo -e "${WHITE}=== Telegram MiniApp Service Manager ===${NC}"
    echo ""
    echo -e "${CYAN}Usage:${NC} $0 [command] [options]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  start       Start all services"
    echo "  stop        Stop all services"
    echo "  restart     Restart services (all, flask, bot, tunnel)"
    echo "  status      Show service status"
    echo "  logs        Show logs (all, flask, bot, tunnel)"
    echo "  setup       Setup virtual environment and dependencies"
    echo "  check       Check dependencies"
    echo "  help        Show this help message"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 start              # Start all services"
    echo "  $0 stop               # Stop all services"
    echo "  $0 restart bot        # Restart only bot"
    echo "  $0 status             # Show status"
    echo "  $0 logs flask         # Show Flask logs"
    echo ""
}

# Main script logic
case "$1" in
    start)
        print_status "$BLUE" "=== Starting Telegram MiniApp Services ==="
        check_dependencies
        setup_venv
        load_env
        start_flask && start_bot && start_tunnel
        print_status "$GREEN" "=== All services started ==="
        show_status
        ;;
    
    stop)
        print_status "$BLUE" "=== Stopping Telegram MiniApp Services ==="
        stop_all
        ;;
    
    restart)
        if [ -z "$2" ]; then
            restart_service "all"
        else
            restart_service "$2"
        fi
        show_status
        ;;
    
    status)
        show_status
        ;;
    
    logs)
        if [ -z "$2" ]; then
            show_logs "all"
        else
            show_logs "$2"
        fi
        ;;
    
    setup)
        print_status "$BLUE" "=== Setting up Telegram MiniApp ==="
        check_dependencies
        setup_venv
        print_status "$GREEN" "Setup complete!"
        ;;
    
    check)
        check_dependencies
        ;;
    
    help|--help|-h)
        show_help
        ;;
    
    *)
        if [ -z "$1" ]; then
            show_help
        else
            print_status "$RED" "Unknown command: $1"
            show_help
            exit 1
        fi
        ;;
esac

exit 0