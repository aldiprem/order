#!/bin/bash
# start_flask.sh - Script to start Flask server
# File path: /root/order/scripts/start_flask.sh

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/root/order"
LOG_DIR="$PROJECT_DIR/logs"
PID_DIR="$PROJECT_DIR/pids"
FLASK_LOG="$LOG_DIR/flask.log"
FLASK_PID="$PID_DIR/flask.pid"

# Create directories
mkdir -p "$LOG_DIR" "$PID_DIR"

# Function to check if Flask is running
is_flask_running() {
    if [ -f "$FLASK_PID" ]; then
        pid=$(cat "$FLASK_PID")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# Function to check if port is in use
check_port() {
    if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    fi
    return 1
}

echo -e "${YELLOW}Starting Flask backend...${NC}"

# Check if already running
if is_flask_running; then
    echo -e "${RED}Flask is already running (PID: $(cat $FLASK_PID))${NC}"
    exit 1
fi

# Check if port is in use
if check_port; then
    echo -e "${RED}Port 4000 is already in use!${NC}"
    lsof -i :4000
    exit 1
fi

# Activate virtual environment
source "$PROJECT_DIR/myenv/bin/activate"

# Go to project root
cd "$PROJECT_DIR"

# Start Flask using run.py
echo -e "Starting Flask with run.py..."
nohup python run.py > "$FLASK_LOG" 2>&1 &
pid=$!
echo $pid > "$FLASK_PID"

# Wait for startup
sleep 3

# Verify it's running
if is_flask_running; then
    echo -e "${GREEN}✓ Flask started successfully (PID: $pid)${NC}"
    echo -e "${GREEN}✓ Log file: $FLASK_LOG${NC}"
    
    # Test the endpoint
    sleep 2
    if curl -s http://127.0.0.1:4000/health > /dev/null; then
        echo -e "${GREEN}✓ Health check passed${NC}"
    else
        echo -e "${RED}✗ Health check failed - server not responding${NC}"
    fi
else
    echo -e "${RED}✗ Failed to start Flask${NC}"
    echo "Check logs: $FLASK_LOG"
    cat "$FLASK_LOG"
    exit 1
fi
