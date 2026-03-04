#!/bin/bash

# clean.sh - Script to clean logs and cache
# Telegram MiniApp Project

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
PID_DIR="$PROJECT_DIR/pids"
PYCACHE_DIRS=$(find "$PROJECT_DIR" -type d -name "__pycache__")
PYC_FILES=$(find "$PROJECT_DIR" -name "*.pyc" -o -name "*.pyo")

echo -e "${BLUE}=== Cleaning Project ===${NC}"

# Clean logs
if [ -d "$LOG_DIR" ]; then
    LOG_SIZE=$(du -sh "$LOG_DIR" | cut -f1)
    LOG_COUNT=$(find "$LOG_DIR" -type f -name "*.log" | wc -l)
    
    echo "Log directory: $LOG_DIR"
    echo "Log files: $LOG_COUNT"
    echo "Log size: $LOG_SIZE"
    
    echo -n "Cleaning logs... "
    find "$LOG_DIR" -type f -name "*.log" -exec truncate -s 0 {} \;
    echo -e "${GREEN}OK${NC}"
fi

# Clean PID files
if [ -d "$PID_DIR" ]; then
    echo -n "Cleaning PID files... "
    rm -f "$PID_DIR"/*.pid
    echo -e "${GREEN}OK${NC}"
fi

# Clean Python cache
if [ ! -z "$PYCACHE_DIRS" ]; then
    echo -n "Cleaning __pycache__ directories... "
    find "$PROJECT_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
    echo -e "${GREEN}OK${NC}"
fi

if [ ! -z "$PYC_FILES" ]; then
    echo -n "Cleaning .pyc files... "
    find "$PROJECT_DIR" -name "*.pyc" -delete 2>/dev/null
    find "$PROJECT_DIR" -name "*.pyo" -delete 2>/dev/null
    echo -e "${GREEN}OK${NC}"
fi

# Clean Flask session files
FLASK_SESSION=$(find "$PROJECT_DIR" -name "flask_session" -type d)
if [ ! -z "$FLASK_SESSION" ]; then
    echo -n "Cleaning Flask sessions... "
    rm -rf "$FLASK_SESSION"
    echo -e "${GREEN}OK${NC}"
fi

# Show disk usage after clean
echo ""
echo -e "${BLUE}Disk usage after clean:${NC}"
du -sh "$PROJECT_DIR" 2>/dev/null || echo "N/A"

echo -e "${GREEN}Clean complete${NC}"