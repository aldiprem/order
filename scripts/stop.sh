#!/bin/bash

# stop.sh - Script to stop all services
# Telegram MiniApp Project

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$PROJECT_DIR/pids"

echo -e "${YELLOW}Stopping all Telegram MiniApp services...${NC}"

# Stop cloudflared tunnel
if [ -f "$PID_DIR/tunnel.pid" ]; then
    pid=$(cat "$PID_DIR/tunnel.pid")
    if kill -0 "$pid" 2>/dev/null; then
        echo -e "Stopping Cloudflared tunnel (PID: $pid)..."
        kill "$pid"
        sleep 2
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}Force stopping Cloudflared tunnel...${NC}"
            kill -9 "$pid" 2>/dev/null
        fi
        rm -f "$PID_DIR/tunnel.pid"
        echo -e "${GREEN}Cloudflared tunnel stopped${NC}"
    else
        echo -e "${YELLOW}Cloudflared tunnel not running${NC}"
        rm -f "$PID_DIR/tunnel.pid"
    fi
fi

# Stop Telegram bot
if [ -f "$PID_DIR/bot.pid" ]; then
    pid=$(cat "$PID_DIR/bot.pid")
    if kill -0 "$pid" 2>/dev/null; then
        echo -e "Stopping Telegram bot (PID: $pid)..."
        kill "$pid"
        sleep 2
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}Force stopping Telegram bot...${NC}"
            kill -9 "$pid" 2>/dev/null
        fi
        rm -f "$PID_DIR/bot.pid"
        echo -e "${GREEN}Telegram bot stopped${NC}"
    else
        echo -e "${YELLOW}Telegram bot not running${NC}"
        rm -f "$PID_DIR/bot.pid"
    fi
fi

# Stop Flask backend
if [ -f "$PID_DIR/flask.pid" ]; then
    pid=$(cat "$PID_DIR/flask.pid")
    if kill -0 "$pid" 2>/dev/null; then
        echo -e "Stopping Flask backend (PID: $pid)..."
        kill "$pid"
        sleep 2
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}Force stopping Flask backend...${NC}"
            kill -9 "$pid" 2>/dev/null
        fi
        rm -f "$PID_DIR/flask.pid"
        echo -e "${GREEN}Flask backend stopped${NC}"
    else
        echo -e "${YELLOW}Flask backend not running${NC}"
        rm -f "$PID_DIR/flask.pid"
    fi
fi

echo -e "${GREEN}All services stopped${NC}"