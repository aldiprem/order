from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from database.data import Database
import os
import logging

app = Flask(__name__, static_folder='.')

# Konfigurasi CORS yang lebih spesifik dan aman
CORS(app, origins=[
    "https://aldiprem.github.io",
    "http://localhost:4000",
    "http://127.0.0.1:4000",
    "http://137.0.0.1:4000",
    "https://*.trycloudflare.com",
    "https://telegram.org",
    "https://web.telegram.org"
], supports_credentials=True, allow_headers=["Content-Type", "Authorization"])

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize database
db = Database()

# Serve static files
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/css/<path:path>')
def serve_css(path):
    return send_from_directory('css', path)

@app.route('/js/<path:path>')
def serve_js(path):
    return send_from_directory('js', path)

@app.route('/<path:path>')
def serve_static(path):
    # Untuk file seperti config.js di root
    return send_from_directory('.', path)

# API Routes
@app.route('/api/verify-user', methods=['POST', 'OPTIONS'])
def verify_user():
    # Handle preflight request
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        user_data = request.json
        logger.info(f"Verifying user: {user_data.get('id')}")
        
        # Add or update user in database
        db.add_user(
            user_id=user_data.get('id'),
            fullname=user_data.get('first_name', '') + ' ' + (user_data.get('last_name', '') or ''),
            username=user_data.get('username')
        )
        return jsonify({'status': 'success', 'message': 'User verified'})
    except Exception as e:
        logger.error(f"Error in verify_user: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/market', methods=['GET', 'OPTIONS'])
def get_market():
    # Handle preflight request
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        # Get filter parameters
        search = request.args.get('search', '')
        based_on = request.args.get('based_on', '')
        type_filter = request.args.get('type', '')
        min_price = request.args.get('min_price', type=int, default=0)
        max_price = request.args.get('max_price', type=int, default=999999999)
        sort_by = request.args.get('sort_by', 'latest')
        
        logger.info(f"Market request with filters: search={search}, based_on={based_on}, type={type_filter}, price={min_price}-{max_price}, sort={sort_by}")
        
        # Get all listed usernames (sudah termasuk shape dari database)
        usernames = db.get_listed_usernames()
        logger.info(f"Found {len(usernames)} listed usernames from database")
        
        # Filter by search
        if search:
            search = search.lower().replace('@', '')
            usernames = [u for u in usernames if search in u[1].lower() or (u[9] and search in u[9].lower())]
            logger.info(f"After search filter: {len(usernames)} usernames")
        
        # Filter by based_on
        if based_on:
            usernames = [u for u in usernames if u[9] == based_on]
            logger.info(f"After based_on filter: {len(usernames)} usernames")
        
        # Filter by price range
        usernames = [u for u in usernames if min_price <= (u[11] or 0) <= max_price]
        logger.info(f"After price filter: {len(usernames)} usernames")
        
        # Filter by type (shape) - GUNAKAN SHAPE DARI DATABASE (index 12)
        if type_filter:
            usernames = [u for u in usernames if u[12] == type_filter]  # shape di index 12
            logger.info(f"After type filter: {len(usernames)} usernames")
        
        # Sort results
        if sort_by == 'price_low':
            usernames.sort(key=lambda x: x[11] or 0)
        elif sort_by == 'price_high':
            usernames.sort(key=lambda x: x[11] or 0, reverse=True)
        elif sort_by == 'char_asc':
            usernames.sort(key=lambda x: len(x[9] or '') if x[9] else 0)
        elif sort_by == 'char_desc':
            usernames.sort(key=lambda x: len(x[9] or '') if x[9] else 0, reverse=True)
        elif sort_by == 'latest':
            usernames.sort(key=lambda x: x[13] or '', reverse=True)  # updated_at di index 13
        
        # Format for frontend - GUNAKAN SHAPE DARI DATABASE
        result = []
        for u in usernames:
            result.append({
                'id': u[0],
                'username': u[1],
                'type': u[2],
                'owner_id': u[3],
                'owner_username': u[4],
                'based_on': u[9],
                'price': u[11] or 0,
                'updated_at': str(u[13]) if u[13] else None,
                'username_type': u[12] if len(u) > 12 else 'UNCOMMON'  # GUNAKAN SHAPE DARI DB
            })
        
        logger.info(f"Returning {len(result)} formatted usernames with shape from database")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in /api/market: {e}")
        import traceback
        traceback.print_exc()
        return jsonify([]), 500

@app.route('/api/based-on-list', methods=['GET', 'OPTIONS'])
def get_based_on_list():
    # Handle preflight request
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        based_on_list = db.get_all_based_on()
        logger.info(f"Returning {len(based_on_list)} based_on options")
        return jsonify(based_on_list)
    except Exception as e:
        logger.error(f"Error in /api/based-on-list: {e}")
        return jsonify([]), 500

@app.route('/api/user-usernames/<int:user_id>', methods=['GET', 'OPTIONS'])
def get_user_usernames(user_id):
    # Handle preflight request
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        logger.info(f"Getting usernames for user_id: {user_id}")
        usernames = db.get_user_added_usernames(user_id)
        result = []
        for u in usernames:
            result.append({
                'id': u[0],
                'username': u[1],
                'type': u[2],
                'based_on': u[9],
                'listed_status': u[10],
                'price': u[11] or 0
            })
        logger.info(f"Found {len(result)} usernames for user {user_id}")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in /api/user-usernames: {e}")
        return jsonify([]), 500

@app.route('/api/activity/<int:user_id>', methods=['GET', 'OPTIONS'])
def get_user_activity(user_id):
    # Handle preflight request
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        logger.info(f"Getting activity for user_id: {user_id}")
        logs, total = db.get_activity_logs(user_id, page=1, limit=50)
        result = []
        for log in logs:
            result.append({
                'id': log[0],
                'action': log[3],
                'details': log[4],
                'created_at': str(log[5]) if log[5] else None
            })
        logger.info(f"Found {len(result)} activity logs for user {user_id}")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in /api/activity: {e}")
        return jsonify([]), 500

# Tambahkan endpoint ini di app.py

@app.route('/api/activities/all', methods=['GET', 'OPTIONS'])
def get_all_activities():
    # Handle preflight request
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        # Get page and limit from query parameters
        page = request.args.get('page', default=1, type=int)
        limit = request.args.get('limit', default=50, type=int)
        
        logger.info(f"Getting all activities, page={page}, limit={limit}")
        
        # You need to create this method in Database class
        # For now, we'll get activities from multiple users
        # This is a placeholder - you need to implement get_all_activity_logs in data.py
        logs, total = db.get_all_activity_logs(page, limit)
        
        result = []
        for log in logs:
            result.append({
                'id': log[0],
                'username': log[1],
                'user_id': log[2],
                'action': log[3],
                'details': log[4],
                'created_at': str(log[5]) if log[5] else None
            })
            
        logger.info(f"Found {len(result)} activities")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in /api/activities/all: {e}")
        return jsonify([]), 500

@app.after_request
def after_request(response):
    """Add headers to all responses"""
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    
    # Untuk development, bisa ditambahkan origin spesifik
    origin = request.headers.get('Origin')
    if origin and (origin.startswith('https://aldiprem.github.io') or 
                   origin.startswith('http://localhost') or 
                   'trycloudflare.com' in origin):
        response.headers.add('Access-Control-Allow-Origin', origin)
    
    return response

def determine_username_type(username, based_on):
    """Determine username type based on rules"""
    if not based_on:
        return "UNCOMMON"
    
    username_lower = username.lower()
    based_on_lower = based_on.lower()
    
    # Check for OP (exact match)
    if username_lower == based_on_lower:
        return "OP"
    
    # Check for SCANON (adds 's' at end)
    if username_lower == based_on_lower + 's':
        return "SCANON"
    
    # Check for SOP (double letters)
    for i in range(len(based_on_lower)-1):
        if based_on_lower[i] == based_on_lower[i+1]:
            if username_lower == based_on_lower[:i+1] + based_on_lower[i+1:]:
                return "SOP"
    
    # Check for CANON (i to l or l to i)
    canon_possible = False
    for a, b in zip(username_lower, based_on_lower):
        if (a == 'l' and b == 'i') or (a == 'i' and b == 'l'):
            canon_possible = True
        elif a != b:
            canon_possible = False
            break
    if canon_possible and len(username_lower) == len(based_on_lower):
        return "CANON"
    
    # Check for TAMPING (add letter at beginning or end)
    if len(username_lower) == len(based_on_lower) + 1:
        if username_lower.startswith(based_on_lower) or username_lower.endswith(based_on_lower):
            return "TAMPING"
    
    # Check for TAMDAL (add letter in middle)
    if len(username_lower) == len(based_on_lower) + 1:
        for i in range(len(based_on_lower)):
            if username_lower.startswith(based_on_lower[:i]) and username_lower[i+1:].startswith(based_on_lower[i:]):
                return "TAMDAL"
    
    # Check for GANHUR (replace one letter)
    if len(username_lower) == len(based_on_lower):
        diff_count = sum(1 for a, b in zip(username_lower, based_on_lower) if a != b)
        if diff_count == 1:
            return "GANHUR"
    
    # Check for SWITCH (swap adjacent letters)
    if len(username_lower) == len(based_on_lower):
        for i in range(len(based_on_lower)-1):
            switched = based_on_lower[:i] + based_on_lower[i+1] + based_on_lower[i] + based_on_lower[i+2:]
            if switched == username_lower:
                return "SWITCH"
    
    # Check for KURHUF (remove one letter)
    if len(username_lower) == len(based_on_lower) - 1:
        for i in range(len(based_on_lower)):
            if username_lower == based_on_lower[:i] + based_on_lower[i+1:]:
                return "KURHUF"
    
    return "UNCOMMON"

if __name__ == '__main__':
    logger.info("Starting Flask server on port 4000...")
    app.run(host='0.0.0.0', port=4000, debug=True)