from flask import Flask, render_template, jsonify, request, session
from flask_cors import CORS
from database import db
import json
import os
import asyncio
import aiohttp
from datetime import timedelta, datetime
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
CORS(app)

# Get configuration from environment variables
BASE_URL = os.getenv('BASE_URL', 'https://daughters-configuration-replied-ethernet.trycloudflare.com')
BOT_TOKEN = os.getenv('BOT_TOKEN')
API_ID = os.getenv('API_ID')
API_HASH = os.getenv('API_HASH')

# Store bot instance (will be set from b.py)
bot_instance = None

def set_bot_instance(bot):
    global bot_instance
    bot_instance = bot

# ============= USER AUTHENTICATION =============

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

# ============= USER PROFILE =============

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
        'last_login': user['last_login'],
        'is_premium': user.get('is_premium', False)
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

# ============= USERNAME VERIFICATION & ADDITION =============

@app.route('/api/username/check', methods=['POST'])
async def check_username():
    """Check username type and permissions using bot"""
    if 'telegram_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401

    data = request.json
    username = data.get('username')
    user_id = session['telegram_id']

    if not username:
        return jsonify({'error': 'Username required'}), 400

    # Clean username
    username = username.replace('@', '').strip()
    if 't.me/' in username:
        username = username.split('t.me/')[-1]

    # Forward request to bot
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{BASE_URL}/bot/check-username", json={
                'username': username,
                'user_id': user_id
            }) as resp:
                result = await resp.json()
                return jsonify(result)
    except Exception as e:
        print(f"Error checking username via bot: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Gagal mengecek username'
        }), 500

@app.route('/api/username/send-otp', methods=['POST'])
async def send_otp():
    """Send OTP to target using bot"""
    if 'telegram_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401

    data = request.json
    username = data.get('username')
    target_type = data.get('type')
    target_id = data.get('target_id')
    target_title = data.get('title')
    user_id = session['telegram_id']

    if not username:
        return jsonify({'error': 'Username required'}), 400

    # Generate OTP
    import random
    otp = str(random.randint(100000, 999999))
    
    # Store OTP in session
    session['pending_otp'] = {
        'code': otp,
        'target': username,
        'type': target_type,
        'target_id': target_id,
        'target_title': target_title,
        'timestamp': datetime.now().isoformat(),
        'user_id': user_id
    }

    # Forward to bot
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{BASE_URL}/bot/send-otp", json={
                'target_id': target_id,
                'target_type': target_type,
                'target_title': target_title,
                'username': username,
                'otp': otp,
                'user_id': user_id
            }) as resp:
                result = await resp.json()
                
                if result.get('success'):
                    return jsonify({
                        'success': True,
                        'message': f'Kode OTP telah dikirim ke {target_title or username}'
                    })
                else:
                    # Clear pending OTP if failed
                    session.pop('pending_otp', None)
                    return jsonify({
                        'success': False,
                        'message': result.get('message', 'Gagal mengirim OTP')
                    }), 400
    except Exception as e:
        print(f"Error sending OTP via bot: {e}")
        session.pop('pending_otp', None)
        return jsonify({
            'success': False,
            'message': 'Gagal mengirim OTP. Silakan coba lagi.'
        }), 500

@app.route('/api/username/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP and add username to database"""
    if 'telegram_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401

    data = request.json
    otp = data.get('otp')
    user_id = session['telegram_id']

    if not otp:
        return jsonify({'error': 'OTP required'}), 400

    # Check OTP from session
    pending = session.get('pending_otp')
    if not pending:
        return jsonify({
            'success': False,
            'error': 'No pending verification'
        }), 400

    if pending['code'] != otp:
        return jsonify({
            'success': False,
            'error': 'Invalid OTP'
        }), 400

    # Check if OTP expired (5 minutes)
    otp_time = datetime.fromisoformat(pending['timestamp'])
    now = datetime.now()
    if (now - otp_time).seconds > 300:
        session.pop('pending_otp', None)
        return jsonify({
            'success': False,
            'error': 'OTP expired'
        }), 400

    # Get user info
    user = db.get_user(user_id)
    
    # Get target info
    target_username = pending['target']
    target_type = pending['type']
    target_id = pending['target_id']
    target_title = pending['target_title']

    # Get owner info from bot
    owner_id = None
    owner_username = None
    if target_type in ['channel', 'supergroup', 'group']:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{BASE_URL}/bot/get-owner", json={
                    'target_id': target_id,
                    'target_type': target_type,
                    'username': target_username
                }) as resp:
                    owner_data = await resp.json()
                    owner_id = owner_data.get('owner_id')
                    owner_username = owner_data.get('owner_username')
        except:
            pass

    # Save to database (you'll need to implement this)
    username_data = {
        'name': target_username,
        'type': 'custom',
        'category': 'custom',
        'price': 0,
        'status': 'available',
        'original': target_username,
        'description': f"{target_type}: {target_title}",
        'owner_id': owner_id,
        'owner_username': owner_username,
        'added_by': user_id,
        'added_by_username': user['username']
    }

    # Clear pending OTP
    session.pop('pending_otp', None)

    return jsonify({
        'success': True,
        'message': 'Username berhasil diverifikasi dan ditambahkan',
        'data': username_data
    })

@app.route('/api/username/cancel', methods=['POST'])
def cancel_verification():
    """Cancel OTP verification"""
    if 'pending_otp' in session:
        session.pop('pending_otp', None)
    return jsonify({'success': True})

def get_error_message(target_type, error_desc):
    """Get user-friendly error message"""
    if 'chat not found' in error_desc.lower():
        return 'Username tidak ditemukan. Pastikan username/channel/group benar.'
    elif 'bot is not a member' in error_desc.lower() or 'need to be an administrator' in error_desc.lower():
        if target_type in ['channel', 'supergroup']:
            return 'Bot tidak dapat mengirim pesan ke channel. Pastikan bot sudah menjadi admin channel.'
        elif target_type == 'group':
            return 'Bot tidak dapat mengirim pesan ke grup. Pastikan bot sudah ditambahkan ke grup.'
        else:
            return 'User belum pernah memulai bot. Minta user untuk /start bot terlebih dahulu.'
    elif 'bot was blocked' in error_desc.lower():
        return 'User telah memblokir bot. Tidak dapat mengirim pesan.'
    else:
        return f'Gagal mengirim OTP: {error_desc}. Silakan coba lagi.'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005, debug=True)
