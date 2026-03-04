#!/bin/bash

# restart.sh - Script to restart services
# Telegram MiniApp Project

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SERVICE=${1:-all}

echo -e "${BLUE}Restarting service: $SERVICE${NC}"

case $SERVICE in
    flask)
        echo -e "${YELLOW}Restarting Flask backend...${NC}"
        "$SCRIPT_DIR/stop.sh"
        sleep 3
        "$SCRIPT_DIR/start.sh"
        ;;
    bot)
        echo -e "${YELLOW}Restarting Telegram bot...${NC}"
        sleep 2
        cd "$PROJECT_DIR"
        source "$PROJECT_DIR/venv/bin/activate"
        nohup python b.py > "$PROJECT_DIR/logs/bot.log" 2>&1 &
        echo $! > "$PROJECT_DIR/pids/bot.pid"
        deactivate
        echo -e "${GREEN}Telegram bot restarted${NC}"
        ;;
    tunnel)
        echo -e "${YELLOW}Restarting Cloudflared tunnel...${NC}"
        pkill cloudflared
        sleep 3
        source "$PROJECT_DIR/.env"
        nohup cloudflared tunnel --url http://127.0.0.1:4000 > "$PROJECT_DIR/logs/tunnel.log" 2>&1 &
        echo $! > "$PROJECT_DIR/pids/tunnel.pid"
        echo -e "${GREEN}Cloudflared tunnel restarted${NC}"
        ;;
    all)
        echo -e "${YELLOW}Restarting all services...${NC}"
        "$SCRIPT_DIR/stop.sh"
        sleep 5
        "$SCRIPT_DIR/start.sh"
        ;;
    *)
        echo -e "${RED}Unknown service: $SERVICE${NC}"
        echo -e "${YELLOW}Available: flask, bot, tunnel, all${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}Restart complete${NC}"
