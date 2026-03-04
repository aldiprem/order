# service_default.py - Flask backend
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
import sys
import os
from datetime import datetime
import json

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.default import Database

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Database instance
db = Database()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'flask-backend'
    })

@app.route('/api/verify-user', methods=['POST'])
def verify_user():
    """Verify Telegram user"""
    try:
        user_data = request.json
        if not user_data:
            return jsonify({'error': 'No user data provided'}), 400
        
        # Save or update user in database
        user_id = user_data.get('id')
        if user_id:
            db.save_user(user_data)
        
        return jsonify({
            'success': True,
            'message': 'User verified successfully',
            'user_id': user_id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/market', methods=['GET'])
def get_market_data():
    """Get market data"""
    try:
        # Get market items from database
        items = db.get_market_items()
        
        # If no items, return default demo data
        if not items:
            items = [
                {'id': 1, 'name': 'Premium Item', 'price': 99.99, 'category': 'premium'},
                {'id': 2, 'name': 'Basic Item', 'price': 19.99, 'category': 'basic'},
                {'id': 3, 'name': 'Special Item', 'price': 49.99, 'category': 'special'}
            ]
        
        return jsonify(items)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/games', methods=['GET'])
def get_games_data():
    """Get games data"""
    try:
        # Get games from database
        games = db.get_games()
        
        # If no games, return default demo data
        if not games:
            games = [
                {'id': 1, 'name': 'Crypto Puzzle', 'players': 1234, 'icon': '🧩'},
                {'id': 2, 'name': 'Token Jump', 'players': 567, 'icon': '🎮'},
                {'id': 3, 'name': 'NFT Racer', 'players': 890, 'icon': '🏎️'}
            ]
        
        return jsonify(games)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/activity', methods=['GET'])
def get_activity_data():
    """Get activity data"""
    try:
        # Get activities from database
        activities = db.get_activities()
        
        # If no activities, return default demo data
        if not activities:
            activities = [
                {'id': 1, 'description': 'Bought Premium Item', 'time': '2 min ago', 'type': 'purchase'},
                {'id': 2, 'description': 'Played Crypto Puzzle', 'time': '1 hour ago', 'type': 'game'},
                {'id': 3, 'description': 'Earned 50 tokens', 'time': '3 hours ago', 'type': 'reward'}
            ]
        
        return jsonify(activities)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile', methods=['GET'])
def get_profile_data():
    """Get profile data"""
    try:
        # Get user_id from query params (in production, get from session)
        user_id = request.args.get('user_id')
        
        if user_id:
            profile = db.get_user_profile(int(user_id))
        else:
            # Return default profile if no user_id
            profile = {
                'balance': 1000,
                'joined': '2024-01-01',
                'level': 5,
                'achievements': 12
            }
        
        return jsonify(profile)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Get specific user data"""
    try:
        user = db.get_user(user_id)
        if user:
            return jsonify(user)
        return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Initialize database tables
    db.init_db()
    
    # Run Flask app
    port = int(os.getenv('FLASK_PORT', 4000))
    debug = os.getenv('FLASK_DEBUG', '1') == '1'
    
    app.run(
        host='127.0.0.1',
        port=port,
        debug=debug
    )
