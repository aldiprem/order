#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
pip3 install -r requirements.txt

# Kill existing Flask process if any
echo "Stopping existing Flask processes..."
pkill -f "python3 app.py"

# Start Flask in background
echo "Starting Flask server..."
nohup python3 app.py > flask.log 2>&1 &

# Get the PID
FLASK_PID=$!
echo "Flask started with PID: $FLASK_PID"

# Start Cloudflared tunnel
echo "Starting Cloudflared tunnel..."
echo "Your public URL will appear below:"
cloudflared tunnel --url http://127.0.0.1:5000
