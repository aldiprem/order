from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from database.data import Database
import os

app = Flask(__name__, static_folder='.')
CORS(app)  # Enable CORS for all routes

# Initialize database
db = Database()

# Serve static files
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# API Routes
@app.route('/api/verify-user', methods=['POST'])
def verify_user():
    try:
        user_data = request.json
        # Add or update user in database
        db.add_user(
            user_id=user_data.get('id'),
            fullname=user_data.get('first_name', '') + ' ' + (user_data.get('last_name', '') or ''),
            username=user_data.get('username')
        )
        return jsonify({'status': 'success', 'message': 'User verified'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/market')
def get_market():
    """Get all listed usernames with filtering"""
    try:
        # Get filter parameters
        search = request.args.get('search', '')
        based_on = request.args.get('based_on', '')
        type_filter = request.args.get('type', '')
        min_price = request.args.get('min_price', type=int, default=0)
        max_price = request.args.get('max_price', type=int, default=999999999)
        sort_by = request.args.get('sort_by', 'latest')
        
        # Get all listed usernames
        usernames = db.get_listed_usernames()
        
        # Filter by search
        if search:
            search = search.lower().replace('@', '')
            usernames = [u for u in usernames if search in u[1].lower() or (u[9] and search in u[9].lower())]
        
        # Filter by based_on
        if based_on:
            usernames = [u for u in usernames if u[9] == based_on]
        
        # Filter by price range
        usernames = [u for u in usernames if min_price <= (u[11] or 0) <= max_price]
        
        # Determine username type based on rules
        for u in usernames:
            u_type = determine_username_type(u[1], u[9])
            u.append(u_type)  # Add type at index 13
        
        # Filter by type if specified
        if type_filter:
            if type_filter in ['UNCOMMON', 'COMMON']:
                usernames = [u for u in usernames if u[13] == type_filter]
            else:
                usernames = [u for u in usernames if u[13] == type_filter]
        
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
            usernames.sort(key=lambda x: x[12] or '', reverse=True)
        
        # Format for frontend
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
                'updated_at': u[12],
                'username_type': u[13]  # Added username type classification
            })
        
        return jsonify(result)
    except Exception as e:
        print(f"Error in /api/market: {e}")
        return jsonify([])

@app.route('/api/based-on-list')
def get_based_on_list():
    """Get all unique based_on values"""
    try:
        based_on_list = db.get_all_based_on()
        return jsonify(based_on_list)
    except Exception as e:
        print(f"Error in /api/based-on-list: {e}")
        return jsonify([])

@app.route('/api/user-usernames/<int:user_id>')
def get_user_usernames(user_id):
    """Get all usernames added by a specific user"""
    try:
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
        return jsonify(result)
    except Exception as e:
        print(f"Error in /api/user-usernames: {e}")
        return jsonify([])

@app.route('/api/activity/<int:user_id>')
def get_user_activity(user_id):
    """Get activity logs for a user"""
    try:
        logs, total = db.get_activity_logs(user_id, page=1, limit=50)
        result = []
        for log in logs:
            result.append({
                'id': log[0],
                'action': log[3],
                'details': log[4],
                'created_at': log[5]
            })
        return jsonify(result)
    except Exception as e:
        print(f"Error in /api/activity: {e}")
        return jsonify([])

def determine_username_type(username, based_on):
    """Determine username type based on rules"""
    if not based_on:
        return "UNCOMMON"  # Default
    
    username_lower = username.lower()
    based_on_lower = based_on.lower()
    
    # Check for CANON (i to L, L to i)
    if ('i' in based_on_lower and 'l' in username_lower) or ('l' in based_on_lower and 'i' in username_lower):
        if len(username_lower) == len(based_on_lower):
            return "CANON"
    
    # Check for SCANON (ends with S, no surname)
    if username_lower.endswith('s') and len(username_lower) == len(based_on_lower) + 1:
        return "SCANON"
    
    # Check for SOP (double letters)
    for i in range(len(username_lower)-1):
        if username_lower[i] == username_lower[i+1]:
            if len(username_lower) == len(based_on_lower) + 1:
                return "SOP"
    
    # Check for TAMPING (add letter at beginning or end)
    if len(username_lower) == len(based_on_lower) + 1:
        if username_lower.startswith(based_on_lower) or username_lower.endswith(based_on_lower):
            return "TAMPING"
    
    # Check for TAMDAL (add letter in middle)
    if len(username_lower) == len(based_on_lower) + 1:
        # Find if one extra letter inserted in middle
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
    
    # Check for OP (exact match)
    if username_lower == based_on_lower:
        return "OP"
    
    return "UNCOMMON"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=4000, debug=True)
