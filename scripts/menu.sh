#!/bin/bash

# menu.sh - Interactive menu for Telegram MiniApp
# Telegram MiniApp Project

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to draw header
draw_header() {
    clear
    echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   ${WHITE}Telegram MiniApp Service Manager${BLUE}   ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
    echo ""
}

# Function to show menu
show_menu() {
    echo -e "${CYAN}Main Menu:${NC}"
    echo ""
    echo -e "${WHITE}1)${NC} Start all services"
    echo -e "${WHITE}2)${NC} Stop all services"
    echo -e "${WHITE}3)${NC} Restart services"
    echo -e "${WHITE}4)${NC} Show status"
    echo -e "${WHITE}5)${NC} View logs"
    echo -e "${WHITE}6)${NC} Database backup"
    echo -e "${WHITE}7)${NC} Database restore"
    echo -e "${WHITE}8)${NC} Clean logs & cache"
    echo -e "${WHITE}9)${NC} Setup project"
    echo -e "${WHITE}0)${NC} Exit"
    echo ""
    echo -n "Choose an option [0-9]: "
}

# Function to show restart submenu
restart_menu() {
    echo ""
    echo -e "${YELLOW}Restart options:${NC}"
    echo "1) Restart all"
    echo "2) Restart Flask only"
    echo "3) Restart Bot only"
    echo "4) Restart Tunnel only"
    echo "5) Back to main menu"
    echo ""
    read -p "Choose [1-5]: " restart_choice
    
    case $restart_choice in
        1) "$SCRIPT_DIR/restart.sh" "all" ;;
        2) "$SCRIPT_DIR/restart.sh" "flask" ;;
        3) "$SCRIPT_DIR/restart.sh" "bot" ;;
        4) "$SCRIPT_DIR/restart.sh" "tunnel" ;;
        5) return ;;
        *) echo -e "${RED}Invalid option${NC}" ;;
    esac
    
    read -p "Press Enter to continue..."
}

# Function to show logs submenu
logs_menu() {
    echo ""
    echo -e "${YELLOW}Log options:${NC}"
    echo "1) View Flask logs"
    echo "2) View Bot logs"
    echo "3) View Tunnel logs"
    echo "4) View all logs"
    echo "5) Follow Flask logs"
    echo "6) Follow Bot logs"
    echo "7) Follow Tunnel logs"
    echo "8) Back to main menu"
    echo ""
    read -p "Choose [1-8]: " log_choice
    
    case $log_choice in
        1) "$SCRIPT_DIR/logs.sh" "flask" 50 ;;
        2) "$SCRIPT_DIR/logs.sh" "bot" 50 ;;
        3) "$SCRIPT_DIR/logs.sh" "tunnel" 50 ;;
        4) "$SCRIPT_DIR/logs.sh" "all" 20 ;;
        5) "$SCRIPT_DIR/logs.sh" "flask" -f ;;
        6) "$SCRIPT_DIR/logs.sh" "bot" -f ;;
        7) "$SCRIPT_DIR/logs.sh" "tunnel" -f ;;
        8) return ;;
        *) echo -e "${RED}Invalid option${NC}" ;;
    esac
}

# Main loop
while true; do
    draw_header
    show_menu
    read choice
    
    case $choice in
        1)
            echo ""
            "$SCRIPT_DIR/start.sh"
            read -p "Press Enter to continue..."
            ;;
        2)
            echo ""
            "$SCRIPT_DIR/stop.sh"
            read -p "Press Enter to continue..."
            ;;
        3)
            restart_menu
            ;;
        4)
            echo ""
            "$SCRIPT_DIR/status.sh"
            read -p "Press Enter to continue..."
            ;;
        5)
            logs_menu
            ;;
        6)
            echo ""
            "$SCRIPT_DIR/backup.sh"
            read -p "Press Enter to continue..."
            ;;
        7)
            echo ""
            "$SCRIPT_DIR/restore.sh"
            read -p "Press Enter to continue..."
            ;;
        8)
            echo ""
            "$SCRIPT_DIR/clean.sh"
            read -p "Press Enter to continue..."
            ;;
        9)
            echo ""
            "$SCRIPT_DIR/start.sh" setup
            read -p "Press Enter to continue..."
            ;;
        0)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            read -p "Press Enter to continue..."
            ;;
    esac
done