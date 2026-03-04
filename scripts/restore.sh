#!/bin/bash

# restore.sh - Script to restore database from backup
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

show_help() {
    echo -e "${BLUE}=== Database Restore ===${NC}"
    echo ""
    echo "Usage: $0 [backup_file]"
    echo ""
    echo "Examples:"
    echo "  $0                    # Show available backups"
    echo "  $0 latest             # Restore latest backup"
    echo "  $0 data_20240101.db.gz # Restore specific backup"
    echo ""
}

# Function to list backups
list_backups() {
    echo -e "${BLUE}Available backups:${NC}"
    if [ -d "$BACKUP_DIR" ]; then
        ls -lh "$BACKUP_DIR" | grep ".gz" | awk '{print $9 " (" $5 ")"}'
    else
        echo "No backups found"
    fi
}

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}Backup directory not found: $BACKUP_DIR${NC}"
    exit 1
fi

# If no argument, show backups
if [ -z "$1" ]; then
    list_backups
    exit 0
fi

# Determine backup file
if [ "$1" = "latest" ]; then
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.gz 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}No backups found${NC}"
        exit 1
    fi
else
    BACKUP_FILE="$BACKUP_DIR/$1"
    if [ ! -f "$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$1.gz"
        if [ ! -f "$BACKUP_FILE" ]; then
            echo -e "${RED}Backup file not found: $1${NC}"
            list_backups
            exit 1
        fi
    fi
fi

echo -e "${BLUE}=== Database Restore ===${NC}"
echo "Backup file: $BACKUP_FILE"

# Confirm restore
echo -e "${YELLOW}WARNING: This will overwrite the current database!${NC}"
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled"
    exit 0
fi

# Stop services before restore
echo "Stopping services..."
"$(dirname "$0")/stop.sh"

# Decompress backup
echo -n "Decompressing backup... "
gunzip -c "$BACKUP_FILE" > "${DB_PATH}.restore"
echo -e "${GREEN}OK${NC}"

# Restore database
echo -n "Restoring database... "
if sqlite3 "${DB_PATH}.restore" "PRAGMA integrity_check;" >/dev/null 2>&1; then
    mv "${DB_PATH}.restore" "$DB_PATH"
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED (backup corrupted)${NC}"
    rm -f "${DB_PATH}.restore"
    exit 1
fi

# Set permissions
chmod 644 "$DB_PATH"

echo -e "${GREEN}Restore complete${NC}"

# Ask to restart services
read -p "Do you want to restart services? (Y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    "$(dirname "$0")/start.sh"
fi