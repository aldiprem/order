from flask import Flask, request, jsonify, session
from flask_cors import CORS
from database import db
import os
from datetime import timedelta
import secrets

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

# CORS configuration untuk GitHub Pages
CORS(app, origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://aldiprem.github.io",
    "https://*.github.io"
], supports_credentials=True)

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "Authentication API is running",
        "endpoints": {
            "register": "POST /api/register",
            "login": "POST /api/login",
            "google_login": "POST /api/google-login",
            "logout": "POST /api/logout",
            "verify_session": "GET /api/verify",
            "profile": "GET /api/profile",
            "users": "GET /api/users (debug)"
        }
    })

@app.route('/api/register', methods=['POST'])
def register():
    """Endpoint untuk registrasi manual"""
    data = request.json
    
    # Validasi input
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not all([username, email, password]):
        return jsonify({"error": "Username, email, and password are required"}), 400
    
    # Validasi format
    if len(username) < 3 or len(username) > 20:
        return jsonify({"error": "Username must be 3-20 characters"}), 400
    
    if '@' not in email:
        return jsonify({"error": "Invalid email format"}), 400
    
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    
    # Buat user baru
    user = db.create_user(username, email, password)
    
    if 'error' in user:
        return jsonify(user), 400
    
    # Buat session
    session_token = db.create_session(user['id'])
    
    # Hapus password dari response
    user.pop('password', None)
    
    return jsonify({
        "message": "User created successfully",
        "user": user,
        "session_token": session_token
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    """Endpoint untuk login manual"""
    data = request.json
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    identifier = data.get('identifier')  # username atau email
    password = data.get('password')
    
    if not all([identifier, password]):
        return jsonify({"error": "Identifier and password are required"}), 400
    
    # Cari user
    user = db.get_user_by_identifier(identifier)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Verifikasi password
    if not db.verify_password(user['email'], password):
        return jsonify({"error": "Invalid password"}), 401
    
    # Buat session baru
    session_token = db.create_session(user['id'])
    
    # Hapus password dari response
    user.pop('password', None)
    
    return jsonify({
        "message": "Login successful",
        "user": user,
        "session_token": session_token
    }), 200

@app.route('/api/google-login', methods=['POST'])
def google_login():
    """Endpoint untuk login dengan Google"""
    data = request.json
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    google_id = data.get('google_id')
    email = data.get('email')
    name = data.get('name')
    picture = data.get('picture')
    
    if not all([google_id, email]):
        return jsonify({"error": "Google ID and email are required"}), 400
    
    # Cek apakah user sudah ada berdasarkan google_id
    user = db.get_user_by_google_id(google_id)
    
    if not user:
        # Cek apakah email sudah terdaftar dengan metode lain
        existing_user = db.get_user_by_email(email)
        if existing_user:
            # Update existing user dengan google_id
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE users 
                SET google_id = ?, full_name = ?, profile_picture = ?, is_google_user = 1
                WHERE id = ?
            ''', (google_id, name, picture, existing_user['id']))
            conn.commit()
            conn.close()
            user = db.get_user_by_id(existing_user['id'])
        else:
            # Buat user baru dengan data Google
            # Generate username dari email
            username = email.split('@')[0]
            # Pastikan username unik
            base_username = username
            counter = 1
            while db.get_user_by_username(username):
                username = f"{base_username}{counter}"
                counter += 1
            
            user = db.create_user(
                username=username,
                email=email,
                google_id=google_id,
                full_name=name,
                profile_picture=picture
            )
    
    if 'error' in user:
        return jsonify(user), 400
    
    # Buat session
    session_token = db.create_session(user['id'])
    
    return jsonify({
        "message": "Google login successful",
        "user": user,
        "session_token": session_token
    }), 200

@app.route('/api/logout', methods=['POST'])
def logout():
    """Endpoint untuk logout"""
    data = request.json
    session_token = data.get('session_token') if data else None
    
    if session_token:
        db.delete_session(session_token)
    
    return jsonify({"message": "Logout successful"}), 200

@app.route('/api/verify', methods=['GET'])
def verify_session():
    """Endpoint untuk verifikasi session"""
    session_token = request.headers.get('Authorization')
    
    if not session_token:
        return jsonify({"error": "No session token provided"}), 401
    
    # Hapus "Bearer " jika ada
    if session_token.startswith('Bearer '):
        session_token = session_token[7:]
    
    session_data = db.verify_session(session_token)
    
    if not session_data:
        return jsonify({"error": "Invalid or expired session"}), 401
    
    # Hapus password dari response
    session_data.pop('password', None)
    
    return jsonify({
        "message": "Session valid",
        "user": {
            "id": session_data['id'],
            "username": session_data['username'],
            "email": session_data['email'],
            "full_name": session_data['full_name'],
            "profile_picture": session_data['profile_picture'],
            "is_google_user": session_data['is_google_user']
        }
    }), 200

@app.route('/api/profile', methods=['GET'])
def get_profile():
    """Endpoint untuk mendapatkan profil user"""
    session_token = request.headers.get('Authorization')
    
    if not session_token:
        return jsonify({"error": "No session token provided"}), 401
    
    if session_token.startswith('Bearer '):
        session_token = session_token[7:]
    
    session_data = db.verify_session(session_token)
    
    if not session_data:
        return jsonify({"error": "Invalid or expired session"}), 401
    
    user = db.get_user_by_id(session_data['user_id'])
    user.pop('password', None)
    
    return jsonify({"user": user}), 200

@app.route('/api/users', methods=['GET'])
def get_all_users():
    """Endpoint debugging untuk melihat semua users"""
    # Hanya untuk development, hapus di production
    users = db.get_all_users()
    return jsonify({"users": users}), 200

if __name__ == '__main__':
    print("Starting Flask server...")
    print("Database: users.db")
    print("\nAvailable endpoints:")
    print("  GET  /")
    print("  POST /api/register")
    print("  POST /api/login")
    print("  POST /api/google-login")
    print("  POST /api/logout")
    print("  GET  /api/verify")
    print("  GET  /api/profile")
    print("  GET  /api/users (debug)")
    print("\nServer running on http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=True)
