#!/usr/bin/env python3
# run.py - Run Flask server from root directory
# File path: /root/order/run.py

"""
Run Flask server for Telegram MiniApp
Usage: python run.py
"""

import os
import sys
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
    logger.info(f"Added {current_dir} to Python path")

try:
    from services.service_default import app
    logger.info("Successfully imported Flask app")
except ImportError as e:
    logger.error(f"Failed to import Flask app: {e}")
    logger.error(f"Make sure services/service_default.py exists")
    sys.exit(1)

if __name__ == '__main__':
    # Load environment variables
    from dotenv import load_dotenv
    env_path = os.path.join(current_dir, '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
        logger.info(f"Loaded environment from {env_path}")
    
    # Get configuration
    port = int(os.getenv('FLASK_PORT', 4000))
    debug = os.getenv('FLASK_DEBUG', '1').lower() in ('true', '1', 't')
    host = os.getenv('FLASK_HOST', '127.0.0.1')
    
    print("\n" + "="*60)
    print(" STARTING FLASK SERVER FROM RUN.PY")
    print("="*60)
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Debug: {debug}")
    print(f"PID: {os.getpid()}")
    print("="*60 + "\n")
    
    try:
        app.run(
            host=host,
            port=port,
            debug=debug,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n" + "="*60)
        print(" Server stopped by user")
        print("="*60)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
