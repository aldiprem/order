#!/usr/bin/env python3
# service_default.py - Flask Backend for Telegram MiniApp
# File path: /root/order/services/service_default.py

import os
import sys
import logging
from datetime import datetime
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add parent directory to Python path - CRITICAL for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
    logger.info(f"Added {parent_dir} to Python path")

try:
    from flask import Flask, jsonify, request
    from flask_cors import CORS
    from dotenv import load_dotenv
    from database.default import Database
    logger.info("All imports successful")
except ImportError as e:
    logger.error(f"Import error: {e}")
    logger.error(f"Python path: {sys.path}")
    sys.exit(1)

# Load environment variables
env_path = os.path.join(parent_dir, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
    logger.info(f"Loaded environment from {env_path}")
else:
    logger.warning(f".env file not found at {env_path}")

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Database instance
try:
    db_path = os.getenv('DATABASE_PATH', 'database/data.db')
    # Make path absolute if relative
    if not os.path.isabs(db_path):
        db_path = os.path.join(parent_dir, db_path)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    db = Database(db_path)
    logger.info(f"Database initialized successfully at {db_path}")
except Exception as e:
    logger.error(f"Database initialization error: {e}")
    db = None

# ==================== ROUTES ====================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'flask-backend',
        'database': 'connected' if db else 'disconnected'
    })

@app.route('/api/verify-user', methods=['POST'])
def verify_user():
    """Verify Telegram user"""
    try:
        user_data = request.json
        logger.info(f"Verifying user: {user_data.get('id') if user_data else 'No data'}")
        
        if not user_data:
            return jsonify({'error': 'No user data provided'}), 400
        
        # Save or update user in database
        user_id = user_data.get('id')
        if user_id and db:
            db.save_user(user_data)
            logger.info(f"User {user_id} saved to database")
        
        return jsonify({
            'success': True,
            'message': 'User verified successfully',
            'user_id': user_id
        })
    except Exception as e:
        logger.error(f"Error in verify_user: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/market', methods=['GET'])
def get_market_data():
    """Get market data"""
    try:
        logger.info("Fetching market data")
        
        if db:
            items = db.get_market_items()
        else:
            items = []
        
        # If no items, return default demo data
        if not items:
            items = [
                {'id': 1, 'name': 'Premium Token', 'price': 99.99, 'category': 'premium', 'stock': 100},
                {'id': 2, 'name': 'Basic Token', 'price': 19.99, 'category': 'basic', 'stock': 1000},
                {'id': 3, 'name': 'Rare NFT', 'price': 499.99, 'category': 'nft', 'stock': 10},
                {'id': 4, 'name': 'Game Pass', 'price': 29.99, 'category': 'subscription', 'stock': 500},
                {'id': 5, 'name': 'Boost Pack', 'price': 9.99, 'category': 'booster', 'stock': 1000}
            ]
            logger.info("Using demo market data")
        
        return jsonify(items)
    except Exception as e:
        logger.error(f"Error in get_market_data: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/games', methods=['GET'])
def get_games_data():
    """Get games data"""
    try:
        logger.info("Fetching games data")
        
        if db:
            games = db.get_games()
        else:
            games = []
        
        # If no games, return default demo data
        if not games:
            games = [
                {'id': 1, 'name': 'Crypto Puzzle', 'description': 'Solve puzzles to earn tokens', 'players': 1234, 'icon': '🧩'},
                {'id': 2, 'name': 'Token Jump', 'description': 'Jump and collect tokens', 'players': 567, 'icon': '🎮'},
                {'id': 3, 'name': 'NFT Racer', 'description': 'Race with NFT cars', 'players': 890, 'icon': '🏎️'},
                {'id': 4, 'name': 'Memory Match', 'description': 'Match cards to win', 'players': 345, 'icon': '🃏'}
            ]
            logger.info("Using demo games data")
        
        return jsonify(games)
    except Exception as e:
        logger.error(f"Error in get_games_data: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/activity', methods=['GET'])
def get_activity_data():
    """Get activity data"""
    try:
        logger.info("Fetching activity data")
        
        # Get user_id from query params
        user_id = request.args.get('user_id')
        
        if user_id and db:
            activities = db.get_activities(int(user_id), limit=20)
        elif db:
            activities = db.get_activities(limit=20)
        else:
            activities = []
        
        # If no activities, return default demo data
        if not activities:
            activities = [
                {'id': 1, 'description': 'Bought Premium Item', 'time': '2 min ago', 'type': 'purchase'},
                {'id': 2, 'description': 'Played Crypto Puzzle', 'time': '1 hour ago', 'type': 'game'},
                {'id': 3, 'description': 'Earned 50 tokens', 'time': '3 hours ago', 'type': 'reward'},
                {'id': 4, 'description': 'Reached level 5', 'time': '1 day ago', 'type': 'achievement'}
            ]
            logger.info("Using demo activity data")
        
        return jsonify(activities)
    except Exception as e:
        logger.error(f"Error in get_activity_data: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile', methods=['GET'])
def get_profile_data():
    """Get profile data"""
    try:
        logger.info("Fetching profile data")
        
        # Get user_id from query params
        user_id = request.args.get('user_id')
        
        if user_id and db:
            profile = db.get_user_profile(int(user_id))
            logger.info(f"Profile for user {user_id}: {profile}")
        else:
            # Return default profile if no user_id
            profile = {
                'balance': 1000,
                'joined': '2024-01-01',
                'level': 5,
                'achievements': 12,
                'username': 'guest',
                'first_name': 'Guest User'
            }
            logger.info("Using demo profile data")
        
        return jsonify(profile)
    except Exception as e:
        logger.error(f"Error in get_profile_data: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Get specific user data"""
    try:
        logger.info(f"Fetching user data for ID: {user_id}")
        
        if db:
            user = db.get_user(user_id)
            if user:
                return jsonify(dict(user))
        
        return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        logger.error(f"Error in get_user: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/balance/<int:user_id>', methods=['GET'])
def get_balance(user_id):
    """Get user balance"""
    try:
        logger.info(f"Fetching balance for user ID: {user_id}")
        
        if db:
            balance = db.get_user_balance(user_id)
            return jsonify({'user_id': user_id, 'balance': balance})
        
        return jsonify({'user_id': user_id, 'balance': 0})
    except Exception as e:
        logger.error(f"Error in get_balance: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/update-balance', methods=['POST'])
def update_balance():
    """Update user balance"""
    try:
        data = request.json
        user_id = data.get('user_id')
        amount = data.get('amount')
        
        logger.info(f"Updating balance for user {user_id} by {amount}")
        
        if not user_id or amount is None:
            return jsonify({'error': 'user_id and amount required'}), 400
        
        if db:
            success = db.update_user_balance(int(user_id), int(amount))
            if success:
                new_balance = db.get_user_balance(int(user_id))
                return jsonify({
                    'success': True,
                    'user_id': user_id,
                    'new_balance': new_balance
                })
        
        return jsonify({'error': 'Failed to update balance'}), 500
    except Exception as e:
        logger.error(f"Error in update_balance: {e}")
        return jsonify({'error': str(e)}), 500

# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    logger.warning(f"404 error: {error}")
    return jsonify({
        'error': 'Endpoint not found',
        'status': 404
    }), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 error: {error}")
    return jsonify({
        'error': 'Internal server error',
        'status': 500
    }), 500

# ==================== MAIN ====================

if __name__ == '__main__':
    print("\n" + "="*60)
    print(" FLASK BACKEND SERVER FOR TELEGRAM MINIAPP")
    print("="*60)
    print(f"Python version: {sys.version}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Script directory: {current_dir}")
    print(f"Parent directory: {parent_dir}")
    print(f"Python path: {sys.path}")
    print(f"Database path: {db_path if 'db_path' in locals() else 'Not set'}")
    print(f"Database status: {'Connected' if db else 'Disconnected'}")
    print("="*60)
    
    # Initialize database tables
    if db:
        try:
            db.init_db()
            print("✓ Database tables initialized successfully")
        except Exception as e:
            print(f"✗ Database init error: {e}")
    
    # Get configuration from environment
    port = int(os.getenv('FLASK_PORT', 4000))
    debug = os.getenv('FLASK_DEBUG', '1').lower() in ('true', '1', 't')
    host = os.getenv('FLASK_HOST', '127.0.0.1')
    
    print(f"\nStarting server on http://{host}:{port}")
    print(f"Debug mode: {'ON' if debug else 'OFF'}")
    print("Press CTRL+C to stop")
    print("="*60 + "\n")
    
    try:
        app.run(
            host=host,
            port=port,
            debug=debug,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n\n" + "="*60)
        print(" Server stopped by user")
        print("="*60)
    except Exception as e:
        print(f"\nError starting server: {e}")
        sys.exit(1)
