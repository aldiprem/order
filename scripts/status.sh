#!/bin/bash

# status.sh - Script to check service status
# Telegram MiniApp Project

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$PROJECT_DIR/pids"
LOG_DIR="$PROJECT_DIR/logs"

echo -e "${BLUE}=== Telegram MiniApp Service Status ===${NC}"
echo ""

# Function to check process status
check_process() {
    local pid_file=$1
    local name=$2
    local color=$3
    
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${GREEN}✓ $name: RUNNING${NC} (PID: $pid)"
            
            # Get process info
            cpu=$(ps -p $pid -o %cpu | tail -1 | tr -d ' ')
            mem=$(ps -p $pid -o %mem | tail -1 | tr -d ' ')
            echo -e "  CPU: $cpu% | MEM: $mem%"
            
            # Get uptime
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                uptime=$(ps -p $pid -o etime | tail -1 | tr -d ' ')
                echo -e "  Uptime: $uptime"
            fi
            
            return 0
        else
            echo -e "${RED}✗ $name: STOPPED${NC} (stale PID file)"
            rm -f "$pid_file"
            return 1
        fi
    else
        if pgrep -f "$3" >/dev/null; then
            pids=$(pgrep -f "$3")
            echo -e "${YELLOW}! $name: RUNNING${NC} (without PID file: $pids)"
        else
            echo -e "${RED}✗ $name: STOPPED${NC}"
        fi
        return 1
    fi
}

# Check Flask
check_process "$PID_DIR/flask.pid" "Flask Backend" "python.*service_default"

# Check Bot
check_process "$PID_DIR/bot.pid" "Telegram Bot" "python.*b.py"

# Check Tunnel
check_process "$PID_DIR/tunnel.pid" "Cloudflared Tunnel" "cloudflared"

# Port check
echo ""
echo -e "${BLUE}=== Port Status ===${NC}"
if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null ; then
    pid=$(lsof -Pi :4000 -sTCP:LISTEN -t)
    echo -e "${GREEN}✓ Port 4000: IN USE${NC} (PID: $pid)"
else
    echo -e "${RED}✗ Port 4000: FREE${NC}"
fi

# Log file sizes
echo ""
echo -e "${BLUE}=== Log Files ===${NC}"
if [ -d "$LOG_DIR" ]; then
    for log in "$LOG_DIR"/*.log; do
        if [ -f "$log" ]; then
            size=$(du -h "$log" | cut -f1)
            modified=$(date -r "$log" "+%Y-%m-%d %H:%M:%S")
            echo -e "$(basename "$log"): ${CYAN}${size}${NC} (last modified: $modified)"
        fi
    done
fi

# Tunnel URL
echo ""
echo -e "${BLUE}=== Tunnel URL ===${NC}"
if [ -f "$LOG_DIR/tunnel.log" ]; then
    tunnel_url=$(grep -o 'https://[^ ]*\.trycloudflare\.com' "$LOG_DIR/tunnel.log" | tail -1)
    if [ ! -z "$tunnel_url" ]; then
        echo -e "${CYAN}$tunnel_url${NC}"
        
        # Test connection
        echo -n "Testing connection... "
        if curl -s -o /dev/null -w "%{http_code}" "$tunnel_url/health" | grep -q "200"; then
            echo -e "${GREEN}OK${NC}"
        else
            echo -e "${RED}FAILED${NC}"
        fi
    else
        echo -e "${YELLOW}No tunnel URL found yet${NC}"
    fi
fi

echo ""
echo -e "${BLUE}=== System Info ===${NC}"
echo "Host: $(hostname)"
echo "OS: $(uname -s -r)"
echo "Uptime: $(uptime | sed 's/.*up \([^,]*\), .*/\1/')"
echo "Memory: $(free -h | grep Mem | awk '{print $3"/"$2}') 2>/dev/null || echo 'N/A'"
echo "Disk: $(df -h . | tail -1 | awk '{print $3"/"$2}')"