#!/bin/bash

# backup.sh - Script to backup database
# Telegram MiniApp Project

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PATH="$PROJECT_DIR/database/data.db"
BACKUP_DIR="$PROJECT_DIR/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/data_$DATE.db"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}=== Database Backup ===${NC}"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}Database file not found: $DB_PATH${NC}"
    exit 1
fi

# Check database integrity
echo -n "Checking database integrity... "
if sqlite3 "$DB_PATH" "PRAGMA integrity_check;" >/dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    exit 1
fi

# Get database size
DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
TABLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM sqlite_master WHERE type='table';" 2>/dev/null)

echo "Database size: $DB_SIZE"
echo "Tables: $TABLE_COUNT"

# Create backup
echo -n "Creating backup... "
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}OK${NC}"
    echo "Backup saved to: $BACKUP_FILE"
    
    # Compress backup
    echo -n "Compressing backup... "
    gzip "$BACKUP_FILE"
    echo -e "${GREEN}OK${NC}"
    echo "Compressed: ${BACKUP_FILE}.gz"
    
    # Show backup size
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    echo "Backup size: $BACKUP_SIZE"
    
    # Clean old backups (keep last 10)
    echo -n "Cleaning old backups... "
    cd "$BACKUP_DIR"
    ls -t *.gz | tail -n +11 | xargs -r rm
    echo -e "${GREEN}OK${NC}"
    
    # List backups
    echo ""
    echo -e "${BLUE}Recent backups:${NC}"
    ls -lh "$BACKUP_DIR" | tail -5
else
    echo -e "${RED}FAILED${NC}"
    exit 1
fi

echo -e "${GREEN}Backup complete${NC}"