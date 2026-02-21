#!/bin/bash

echo "Stopping Flask server..."
pkill -f "python3 app.py"

echo "Stopping Cloudflared..."
pkill -f "cloudflared"

echo "All services stopped."
