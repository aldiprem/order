#!/bin/bash

# logs.sh - Script to view logs
# Telegram MiniApp Project

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"

SERVICE=${1:-all}
LINES=${2:-50}

show_help() {
    echo -e "${BLUE}=== Log Viewer ===${NC}"
    echo ""
    echo "Usage: $0 [service] [lines]"
    echo ""
    echo "Services:"
    echo "  flask   - Flask backend logs"
    echo "  bot     - Telegram bot logs"
    echo "  tunnel  - Cloudflared tunnel logs"
    echo "  all     - All logs (default)"
    echo ""
    echo "Examples:"
    echo "  $0 flask 100    # Show last 100 lines of Flask logs"
    echo "  $0 bot -f       # Follow bot logs"
    echo "  $0 tunnel 50    # Show last 50 lines of tunnel logs"
    echo ""
}

# Check if follow mode
if [[ "$2" == "-f" ]] || [[ "$2" == "--follow" ]]; then
    FOLLOW=true
    LINES=50
else
    FOLLOW=false
fi

case $SERVICE in
    flask)
        if [ ! -f "$LOG_DIR/flask.log" ]; then
            echo -e "${RED}Flask log file not found${NC}"
            exit 1
        fi
        if [ "$FOLLOW" = true ]; then
            tail -f "$LOG_DIR/flask.log"
        else
            tail -n $LINES "$LOG_DIR/flask.log"
        fi
        ;;
    bot)
        if [ ! -f "$LOG_DIR/bot.log" ]; then
            echo -e "${RED}Bot log file not found${NC}"
            exit 1
        fi
        if [ "$FOLLOW" = true ]; then
            tail -f "$LOG_DIR/bot.log"
        else
            tail -n $LINES "$LOG_DIR/bot.log"
        fi
        ;;
    tunnel)
        if [ ! -f "$LOG_DIR/tunnel.log" ]; then
            echo -e "${RED}Tunnel log file not found${NC}"
            exit 1
        fi
        if [ "$FOLLOW" = true ]; then
            tail -f "$LOG_DIR/tunnel.log"
        else
            tail -n $LINES "$LOG_DIR/tunnel.log"
        fi
        ;;
    all)
        echo -e "${BLUE}=== Flask Logs ===${NC}"
        tail -n $LINES "$LOG_DIR/flask.log" 2>/dev/null || echo "No logs"
        echo ""
        echo -e "${BLUE}=== Bot Logs ===${NC}"
        tail -n $LINES "$LOG_DIR/bot.log" 2>/dev/null || echo "No logs"
        echo ""
        echo -e "${BLUE}=== Tunnel Logs ===${NC}"
        tail -n $LINES "$LOG_DIR/tunnel.log" 2>/dev/null || echo "No logs"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown service: $SERVICE${NC}"
        show_help
        exit 1
        ;;
esac