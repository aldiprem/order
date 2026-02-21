from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
import secrets
import json
from datetime import datetime
import hashlib
import hmac
import base64
from database import db

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app)

# ==================== HELPER FUNCTIONS ====================

def hash_password(password):
    """Hash password (simple - ganti dengan bcrypt untuk production)"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, hashed):
    """Verifikasi password"""
    return hash_password(password) == hashed

def generate_session_token():
    """Generate unique session token"""
    return secrets.token_urlsafe(32)

def verify_telegram_data(telegram_data):
    """
    Verifikasi bahwa data benar-benar dari Telegram
    Untuk production, implementasikan verifikasi HMAC
    """
    # TODO: Implementasi verifikasi HMAC dengan bot token
    return True

def get_client_info():
    """Mendapatkan IP dan User Agent client"""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    user_agent = request.headers.get('User-Agent', '')
    return ip, user_agent

# ==================== ROUTES ====================

@app.route('/')
def index():
    """Render halaman utama"""
    return render_template('index.html')

@app.route('/api/health', methods=['GET'])
def health_check():
    """Endpoint untuk cek kesehatan API"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'message': 'API is running'
    })

@app.route('/api/register', methods=['POST'])
def register():
    """
    Endpoint untuk registrasi user baru
    Menerima data Telegram dan data form
    """
    try:
        data = request.json
        print("📥 Register request:", data)
        
        # Ambil data dari request
        telegram_data = data.get('telegram_data', {})
        form_data = data.get('form_data', {})
        
        # Validasi data Telegram
        if not telegram_data or not telegram_data.get('id'):
            return jsonify({
                'success': False,
                'message': 'Data Telegram tidak valid'
            }), 400
        
        # Validasi form data
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if not form_data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'Field {field} wajib diisi'
                }), 400
        
        # Hash password
        form_data['password'] = hash_password(form_data['password'])
        
        # Tambahkan IP dan User Agent
        ip, user_agent = get_client_info()
        form_data['ip'] = ip
        form_data['user_agent'] = user_agent
        
        # Simpan ke database
        result = db.create_user(telegram_data, form_data)
        
        if result['success']:
            # Buat session token
            session_token = generate_session_token()
            db.create_session(
                result['user_id'], 
                telegram_data, 
                session_token,
                ip, 
                user_agent
            )
            
            # Ambil data user lengkap
            user = db.get_user_by_telegram_id(telegram_data.get('id'))
            
            return jsonify({
                'success': True,
                'message': 'Registrasi berhasil',
                'session_token': session_token,
                'user': dict(user) if user else None
            }), 201
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
            
    except Exception as e:
        print("❌ Error in register:", str(e))
        return jsonify({
            'success': False,
            'message': f'Terjadi kesalahan: {str(e)}'
        }), 500

@app.route('/api/login', methods=['POST'])
def login():
    """
    Endpoint untuk login manual (username/email + password)
    """
    try:
        data = request.json
        print("📥 Login request:", data)
        
        username_or_email = data.get('username_or_email')
        password = data.get('password')
        telegram_data = data.get('telegram_data', {})
        
        if not username_or_email or not password:
            return jsonify({
                'success': False,
                'message': 'Username/email dan password wajib diisi'
            }), 400
        
        # Verifikasi password
        hashed_password = hash_password(password)
        user = db.verify_login(username_or_email, hashed_password)
        
        if user:
            # Update last login
            ip, user_agent = get_client_info()
            db.update_last_login(user['id'], ip, user_agent)
            
            # Buat session baru
            session_token = generate_session_token()
            db.create_session(
                user['id'], 
                telegram_data or user,  # Pakai data Telegram jika ada
                session_token,
                ip, 
                user_agent
            )
            
            return jsonify({
                'success': True,
                'message': 'Login berhasil',
                'session_token': session_token,
                'user': user
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Username/email atau password salah'
            }), 401
            
    except Exception as e:
        print("❌ Error in login:", str(e))
        return jsonify({
            'success': False,
            'message': f'Terjadi kesalahan: {str(e)}'
        }), 500

@app.route('/api/telegram-login', methods=['POST'])
def telegram_login():
    """
    Endpoint untuk login otomatis dengan data Telegram
    """
    try:
        data = request.json
        print("📥 Telegram login request:", data)
        
        telegram_data = data.get('telegram_data', {})
        
        if not telegram_data or not telegram_data.get('id'):
            return jsonify({
                'success': False,
                'message': 'Data Telegram tidak valid'
            }), 400
        
        # Cek apakah user sudah terdaftar dengan Telegram ID ini
        user = db.get_user_by_telegram_id(telegram_data.get('id'))
        
        if user:
            # Update last login
            ip, user_agent = get_client_info()
            db.update_last_login(user['id'], ip, user_agent)
            
            # Buat session baru
            session_token = generate_session_token()
            db.create_session(
                user['id'], 
                telegram_data,
                session_token,
                ip, 
                user_agent
            )
            
            return jsonify({
                'success': True,
                'message': 'Login berhasil',
                'session_token': session_token,
                'user': user,
                'needs_registration': False
            }), 200
        else:
            # User belum terdaftar, perlu registrasi
            return jsonify({
                'success': True,
                'message': 'User Telegram ditemukan, silakan lengkapi data',
                'telegram_data': telegram_data,
                'needs_registration': True
            }), 200
            
    except Exception as e:
        print("❌ Error in telegram_login:", str(e))
        return jsonify({
            'success': False,
            'message': f'Terjadi kesalahan: {str(e)}'
        }), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    """Endpoint untuk logout"""
    try:
        data = request.json
        session_token = data.get('session_token')
        
        if session_token:
            db.delete_session(session_token)
        
        return jsonify({
            'success': True,
            'message': 'Logout berhasil'
        }), 200
        
    except Exception as e:
        print("❌ Error in logout:", str(e))
        return jsonify({
            'success': False,
            'message': f'Terjadi kesalahan: {str(e)}'
        }), 500

@app.route('/api/session', methods=['POST'])
def check_session():
    """Endpoint untuk cek session"""
    try:
        data = request.json
        session_token = data.get('session_token')
        
        if not session_token:
            return jsonify({
                'success': False,
                'message': 'Session token tidak ditemukan'
            }), 401
        
        session_data = db.get_session(session_token)
        
        if session_data:
            return jsonify({
                'success': True,
                'user': dict(session_data),
                'session_token': session_token
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Session tidak valid atau telah kadaluarsa'
            }), 401
            
    except Exception as e:
        print("❌ Error in check_session:", str(e))
        return jsonify({
            'success': False,
            'message': f'Terjadi kesalahan: {str(e)}'
        }), 500

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Endpoint untuk mendapatkan data user by ID"""
    try:
        # Ini endpoint yang dipanggil di main.js
        conn = db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE id = ? OR telegram_id = ?', (user_id, user_id))
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return jsonify({
                'success': True,
                'user': dict(user)
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'User tidak ditemukan'
            }), 404
            
    except Exception as e:
        print("❌ Error in get_user:", str(e))
        return jsonify({
            'success': False,
            'message': f'Terjadi kesalahan: {str(e)}'
        }), 500

# ==================== ADMIN ROUTES (Opsional) ====================

@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    """Endpoint admin untuk melihat semua user"""
    users = db.get_all_users()
    return jsonify({
        'success': True,
        'users': users,
        'total': len(users)
    }), 200

@app.route('/api/admin/users/<int:user_id>/history', methods=['GET'])
def get_user_history(user_id):
    """Endpoint admin untuk melihat history login user"""
    history = db.get_login_history(user_id)
    return jsonify({
        'success': True,
        'history': history
    }), 200

# ==================== MAIN ====================

if __name__ == '__main__':
    print("="*50)
    print("🚀 Starting Flask Server...")
    print("📁 Database: telegram_users.db")
    print("🔗 URL: http://localhost:5005")
    print("="*50)
    
    # Jalankan dengan debug mode
    app.run(debug=True, host='0.0.0.0', port=5005)
