from flask import Flask, render_template, jsonify, request, session
from flask_cors import CORS
from database import db
import json
import os
from datetime import timedelta

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
CORS(app)

BASE_URL = "https://daughters-configuration-replied-ethernet.trycloudflare.com"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/init', methods=['POST'])
def init_user():
    """Inisialisasi user dari Telegram Web App"""
    data = request.json
    user_data = data.get('user')
    
    if not user_data or user_data.get('id') == 'guest':
        return jsonify({
            'status': 'guest', 
            'user': {
                'id': 'guest',
                'username': 'guest_user',
                'first_name': 'Guest'
            }
        })
    
    # Simpan user ke database
    user_db_id = db.save_user(user_data)
    db.update_last_login(user_data.get('id'))
    
    # Cek apakah admin
    is_admin = db.is_admin(user_data.get('id'))
    
    # Simpan ke session
    session['user_id'] = user_db_id
    session['telegram_id'] = user_data.get('id')
    session['is_admin'] = is_admin
    session.permanent = True
    
    return jsonify({
        'status': 'authenticated',
        'user': {
            'id': user_data.get('id'),
            'username': user_data.get('username', f"user_{user_data.get('id')}"),
            'first_name': user_data.get('first_name', 'User'),
            'last_name': user_data.get('last_name', ''),
            'photo_url': user_data.get('photo_url'),
            'language_code': user_data.get('language_code'),
            'is_premium': user_data.get('is_premium', False)
        },
        'is_admin': is_admin
    })

@app.route('/api/user/me', methods=['GET'])
def get_current_user():
    """Mendapatkan data user yang sedang login"""
    if 'telegram_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    user = db.get_user(session['telegram_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user['telegram_id'],
        'username': user['username'],
        'first_name': user['first_name'],
        'last_name': user['last_name'],
        'photo_url': user['photo_url'],
        'is_admin': user['is_admin'],
        'created_at': user['created_at'],
        'last_login': user['last_login']
    })

@app.route('/api/user/stats', methods=['GET'])
def get_user_stats():
    """Mendapatkan statistik user (untuk admin)"""
    if 'telegram_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    # Cek admin
    if not db.is_admin(session['telegram_id']):
        return jsonify({'error': 'Unauthorized'}), 403
    
    users = db.get_all_users()
    total_users = len(users)
    admins = len([u for u in users if u['is_admin']])
    
    return jsonify({
        'total_users': total_users,
        'admins': admins,
        'users': users[:10]  # 10 user terbaru
    })

@app.route('/api/user/list', methods=['GET'])
def list_users():
    """List semua user (hanya admin)"""
    if 'telegram_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    if not db.is_admin(session['telegram_id']):
        return jsonify({'error': 'Unauthorized'}), 403
    
    users = db.get_all_users()
    return jsonify(users)

@app.route('/api/user/<int:telegram_id>/set-admin', methods=['POST'])
def set_admin(telegram_id):
    """Set user sebagai admin (hanya admin)"""
    if 'telegram_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    if not db.is_admin(session['telegram_id']):
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    is_admin = data.get('is_admin', True)
    
    db.set_admin(telegram_id, is_admin)
    
    return jsonify({'success': True, 'is_admin': is_admin})

@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout user"""
    session.clear()
    return jsonify({'success': True})

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'users_count': db.get_user_count(),
        'base_url': BASE_URL
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005, debug=True)
