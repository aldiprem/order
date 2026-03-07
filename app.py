from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from database.data import Database
import os
import logging
import threading
import sqlite3
import time
from b import call_bot_sync, run_bot, is_bot_ready

app = Flask(__name__, static_folder='.')

# Konfigurasi CORS
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

# Bot thread
bot_thread = None
bot_started = False

def start_bot_thread():
    """Start bot in separate thread"""
    global bot_thread, bot_started
    if bot_thread is None or not bot_thread.is_alive():
        bot_thread = threading.Thread(target=run_bot, daemon=True)
        bot_thread.start()
        logger.info("✅ Bot thread started")
        bot_started = True
        
        # Tunggu bot siap
        wait_start = time.time()
        while time.time() - wait_start < 30:  # Wait max 30 seconds
            if is_bot_ready():
                logger.info("✅ Bot is ready")
                break
            time.sleep(0.5)

# Start bot thread
start_bot_thread()

# ==================== SERVE STATIC FILES ====================

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
    return send_from_directory('.', path)

# ==================== API ENDPOINTS ====================

@app.route('/api/bot/get-entity', methods=['POST'])
def bot_get_entity():
    """Endpoint untuk mendapatkan entity info dari username"""
    try:
        data = request.json
        logger.info(f"📥 GET ENTITY request: {data}")
        
        if not data or 'username' not in data:
            logger.error("❌ Missing username parameter")
            return jsonify({'success': False, 'error': 'Username diperlukan'}), 400
        
        # Cek apakah bot siap
        if not is_bot_ready():
            logger.warning("⚠️ Bot not ready yet")
            return jsonify({'success': False, 'error': 'Bot sedang memuat, silakan coba lagi', 'retry': True}), 503
        
        username = data.get('username')
        logger.info(f"🔍 Checking username: {username}")
        
        result = call_bot_sync('get_entity', data)
        logger.info(f"📤 GET ENTITY response: {result}")
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"❌ Error in bot_get_entity: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/bot/get-channel-creator', methods=['POST'])
def bot_get_channel_creator():
    """Endpoint untuk mendapatkan creator/owner channel"""
    try:
        data = request.json
        
        # Cek apakah bot siap
        if not is_bot_ready():
            return jsonify({'success': False, 'error': 'Bot sedang memuat, silakan coba lagi', 'retry': True}), 503
        
        result = call_bot_sync('get_channel_creator', data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"❌ Error in bot_get_channel_creator: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/bot/send-otp', methods=['POST'])
def bot_send_otp():
    """Endpoint untuk mengirim OTP ke user"""
    try:
        data = request.json
        
        # Cek apakah bot siap
        if not is_bot_ready():
            return jsonify({'success': False, 'error': 'Bot sedang memuat, silakan coba lagi', 'retry': True}), 503
        
        result = call_bot_sync('send_otp', data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"❌ Error in bot_send_otp: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/bot/send-channel-verification', methods=['POST'])
def bot_send_channel_verification():
    """Endpoint untuk mengirim pesan verifikasi ke channel"""
    try:
        data = request.json
        
        # Cek apakah bot siap
        if not is_bot_ready():
            return jsonify({'success': False, 'error': 'Bot sedang memuat, silakan coba lagi', 'retry': True}), 503
        
        result = call_bot_sync('send_channel_verification', data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"❌ Error in bot_send_channel_verification: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/bot/notify-requester', methods=['POST'])
def bot_notify_requester():
    """Endpoint untuk mengirim notifikasi ke requester"""
    try:
        data = request.json
        
        # Cek apakah bot siap
        if not is_bot_ready():
            return jsonify({'success': False, 'error': 'Bot sedang memuat, silakan coba lagi', 'retry': True}), 503
        
        result = call_bot_sync('notify_requester', data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"❌ Error in bot_notify_requester: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== ENDPOINT CEK BOT STATUS ====================

@app.route('/api/bot/status', methods=['GET'])
def bot_status():
    """Cek status bot"""
    return jsonify({
        'ready': is_bot_ready(),
        'started': bot_started
    })

# ==================== API ENDPOINTS DATABASE (SISANYA TETAP SAMA) ====================

@app.route('/api/verify-user', methods=['POST', 'OPTIONS'])
def verify_user():
    """Verifikasi user Telegram"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        user_data = request.json
        logger.info(f"Verifying user: {user_data.get('id')}")
        
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
    """Get all listed usernames for market"""
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
        
        # Get all listed usernames
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
        
        # Filter by type (shape)
        if type_filter and type_filter != 'all':
            usernames = [u for u in usernames if u[12] == type_filter]
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
        elif sort_by == 'alpha_asc':
            usernames.sort(key=lambda x: x[1].lower() if x[1] else '')
        elif sort_by == 'alpha_desc':
            usernames.sort(key=lambda x: x[1].lower() if x[1] else '', reverse=True)
        elif sort_by == 'latest':
            usernames.sort(key=lambda x: x[14] or '', reverse=True)  # updated_at
        
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
                'updated_at': str(u[14]) if len(u) > 14 else None,
                'username_type': u[12] if len(u) > 12 else 'OP',
                'kind': u[13] if len(u) > 13 else 'MULCHAR INDO'
            })
        
        logger.info(f"Returning {len(result)} formatted usernames")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in /api/market: {e}")
        import traceback
        traceback.print_exc()
        return jsonify([]), 500

@app.route('/api/based-on-list', methods=['GET', 'OPTIONS'])
def get_based_on_list():
    """Get all unique based_on values"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        based_on_list = db.get_all_based_on()
        logger.info(f"Returning {len(based_on_list)} based_on options")
        return jsonify(based_on_list)
    except Exception as e:
        logger.error(f"Error in /api/based-on-list: {e}")
        return jsonify([]), 500

@app.route('/api/username/<path:username>', methods=['GET', 'OPTIONS'])
def get_username_detail(username):
    """Get detailed info about a specific username"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        # Clean username
        clean_username = username.replace('@', '')
        logger.info(f"Getting detail for username: {clean_username}")
        
        usn_detail = db.get_username_detail(clean_username)
        
        if not usn_detail:
            logger.warning(f"Username not found: {clean_username}")
            return jsonify({'error': 'Username not found'}), 404
        
        result = {
            'id': usn_detail[0],
            'username': usn_detail[1],
            'type': usn_detail[2],
            'owner_id': usn_detail[3],
            'owner_username': usn_detail[4],
            'added_by': usn_detail[5],
            'verified_at': str(usn_detail[6]) if usn_detail[6] else None,
            'status': usn_detail[7],
            'based_on': usn_detail[9],
            'listed_status': usn_detail[10],
            'price': usn_detail[11] or 0,
            'username_type': usn_detail[12] if len(usn_detail) > 12 else 'OP',
            'kind': usn_detail[13] if len(usn_detail) > 13 else 'MULCHAR INDO',
            'updated_at': str(usn_detail[14]) if len(usn_detail) > 14 else None
        }
        
        logger.info(f"Returning detail for @{clean_username}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in /api/username/{username}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/user-usernames/<int:user_id>', methods=['GET', 'OPTIONS'])
def get_user_usernames(user_id):
    """Get all usernames added by a specific user"""
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
    """Get activity logs for a user"""
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

@app.route('/api/activities/all', methods=['GET', 'OPTIONS'])
def get_all_activities():
    """Get all activities with pagination"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        page = request.args.get('page', default=1, type=int)
        limit = request.args.get('limit', default=50, type=int)
        
        logger.info(f"Getting all activities, page={page}, limit={limit}")
        
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

@app.route('/api/pending-requests/<int:user_id>', methods=['GET', 'OPTIONS'])
def get_pending_requests(user_id):
    """Get pending requests for a user"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        pending = db.get_user_pending_requests(user_id)
        
        result = []
        for req in pending:
            result.append({
                'id': req[1],  # request_id
                'username': req[2],
                'status': req[4],
                'created_at': str(req[5]) if req[5] else None,
                'type': 'webapp'
            })
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in pending-requests: {e}")
        return jsonify([]), 500

@app.route('/api/create-verification-session', methods=['POST'])
def create_verification_session():
    """Buat session verifikasi baru"""
    try:
        data = request.json
        username = data.get('username')
        type_ = data.get('type')
        requester_id = data.get('requester_id')
        owner_id = data.get('owner_id')
        
        if not username or not type_ or not requester_id:
            return jsonify({'success': False, 'error': 'Parameter tidak lengkap'}), 400
        
        # Generate OTP untuk user
        otp_code = None
        if type_ == 'user':
            otp_code = db.generate_otp()
        
        # Generate session ID
        session_id = db.generate_verification_id()
        
        # Simpan di database
        result = db.create_verification_session(
            session_id,
            username,
            type_,
            requester_id,
            owner_id,
            otp_code
        )
        
        if result:
            return jsonify({
                'success': True,
                'session_id': session_id,
                'otp_code': otp_code
            })
        else:
            return jsonify({'success': False, 'error': 'Gagal membuat session'}), 500
            
    except Exception as e:
        logger.error(f"Error in create_verification_session: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/check-user-exists', methods=['POST'])
def check_user_exists():
    """Cek apakah user sudah ada di database"""
    try:
        data = request.json
        username = data.get('username')
        
        if not username:
            return jsonify({'success': False, 'error': 'Username diperlukan'}), 400
        
        # Bersihkan username
        clean_username = username.replace('@', '')
        
        user = db.get_user_by_username(clean_username)
        
        return jsonify({
            'success': True,
            'exists': user is not None
        })
        
    except Exception as e:
        logger.error(f"Error in check_user_exists: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    """Verifikasi OTP dari website"""
    try:
        data = request.json
        request_id = data.get('request_id')
        otp_code = data.get('otp_code')
        user_id = data.get('user_id')
        
        if not request_id or not otp_code or not user_id:
            return jsonify({'success': False, 'error': 'Parameter tidak lengkap'}), 400
        
        # Cek session di database
        session = db.get_verification_session(request_id)
        
        if not session:
            return jsonify({'success': False, 'error': 'Sesi tidak valid'}), 404
        
        if session[6] != otp_code:  # otp_code
            return jsonify({'success': False, 'error': 'Kode OTP salah'}), 400
        
        # OTP benar - proses verifikasi
        username = session[2]
        type_ = session[3]
        requester_id = session[4]
        owner_id = session[5]
        
        # Update session
        db.update_verification_session(request_id, status="verified")
        
        # Add username
        success = db.add_username_request(username, type_, owner_id, None, requester_id)
        
        if success:
            # Kirim notifikasi ke requester via bot
            if is_bot_ready():
                call_bot_sync('notify_requester', {
                    'requester_id': requester_id,
                    'message': f'Username @{username} berhasil diverifikasi!',
                    'is_success': True
                })
            
            return jsonify({'success': True, 'message': 'Verifikasi berhasil'})
        else:
            return jsonify({'success': False, 'error': 'Gagal menambahkan ke database'}), 500
        
    except Exception as e:
        logger.error(f"Error in verify_otp: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/webapp/add-username', methods=['POST', 'OPTIONS'])
def webapp_add_username():
    """Endpoint untuk menambah username dari webapp"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.json
        print("\n" + "="*50)
        print("📱 WEBAPP ADD USERNAME REQUEST RECEIVED")
        print(f"Raw data: {data}")
        
        username = data.get('username')
        user_id = data.get('user_id')
        
        print(f"Username: {username}")
        print(f"User ID: {user_id}")
        
        if not username or not user_id:
            print("❌ ERROR: Missing username or user_id")
            return jsonify({'success': False, 'error': 'Username dan user_id diperlukan'}), 400
        
        # Bersihkan username
        clean_username = username.replace('@', '').strip()
        print(f"Cleaned username: {clean_username}")
        
        if not clean_username:
            print("❌ ERROR: Invalid username format")
            return jsonify({'success': False, 'error': 'Username tidak valid'}), 400
        
        # Buat session ID untuk request ini
        request_id = db.generate_verification_id()
        print(f"Generated request_id: {request_id}")
        
        # Simpan di database sebagai pending request dari web app
        print("Attempting to save to database...")
        success = db.create_webapp_request(request_id, clean_username, user_id)
        
        if success:
            print(f"✅ SUCCESS: Webapp request saved with ID: {request_id}")
            return jsonify({
                'success': True, 
                'message': 'Permintaan telah dikirim', 
                'request_id': request_id
            })
        else:
            print("❌ ERROR: Failed to save to database")
            return jsonify({'success': False, 'error': 'Gagal menyimpan permintaan'}), 400
        
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/debug/webapp-requests', methods=['GET'])
def debug_webapp_requests():
    """Debug endpoint to see all webapp requests"""
    try:
        conn = sqlite3.connect("database/indotag.db")
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        # Cek apakah tabel ada
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='webapp_requests'")
        if not cur.fetchone():
            return jsonify({'error': 'Table webapp_requests not found'}), 404
            
        cur.execute("SELECT * FROM webapp_requests ORDER BY created_at DESC LIMIT 20")
        rows = cur.fetchall()
        
        result = []
        for row in rows:
            result.append({
                'id': row[0],
                'request_id': row[1],
                'username': row[2],
                'requester_id': row[3],
                'status': row[4],
                'created_at': str(row[5]) if row[5] else None,
                'updated_at': str(row[6]) if row[6] else None
            })
        
        conn.close()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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

if __name__ == '__main__':
    logger.info("Starting Flask server on port 4000...")
    app.run(host='0.0.0.0', port=4000, debug=True)