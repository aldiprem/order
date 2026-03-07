import sqlite3
import datetime
import random
import string
import pytz
import threading
import os
from contextlib import contextmanager

# Set timezone Asia/Jakarta (WIB)
JAKARTA_TZ = pytz.timezone('Asia/Jakarta')

def get_jakarta_time():
    """Get current time in Asia/Jakarta timezone"""
    return datetime.datetime.now(JAKARTA_TZ).replace(tzinfo=None)

class Database:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, *args, **kwargs):
        """Singleton pattern untuk database connection"""
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(Database, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self, db_path="database/indotag.db"):
        """Initialize database - hanya sekali"""
        if self._initialized:
            return
            
        # Ensure database directory exists
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        self.db_path = db_path
        self._local = threading.local()
        self._init_lock = threading.Lock()
        
        # Inisialisasi tabel
        self._create_tables()
        
        self._initialized = True
        print(f"✅ Database initialized: {db_path}")
    
    @contextmanager
    def get_connection(self):
        """Get thread-local connection"""
        if not hasattr(self._local, 'conn'):
            # Buat koneksi baru untuk thread ini
            conn = sqlite3.connect(self.db_path, timeout=30, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")  # WAL mode untuk concurrent access
            conn.execute("PRAGMA synchronous=NORMAL")
            self._local.conn = conn
            self._local.cursor = conn.cursor()
        
        try:
            yield self._local.cursor
            self._local.conn.commit()
        except Exception as e:
            self._local.conn.rollback()
            raise e
    
    def close_all_connections(self):
        """Close all connections (panggil saat shutdown)"""
        if hasattr(self._local, 'conn'):
            self._local.conn.close()
            delattr(self._local, 'conn')
    
    def _create_tables(self):
        """Create all tables if they don't exist"""
        with self.get_connection() as cur:
            # Tabel users
            cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE,
                fullname TEXT,
                username TEXT,
                joined_at TIMESTAMP,
                first_start TIMESTAMP,
                last_start TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)
            
            # Tabel added_usernames
            cur.execute("""
            CREATE TABLE IF NOT EXISTS added_usernames (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                type TEXT CHECK(type IN ('channel', 'user')),
                owner_id INTEGER,
                owner_username TEXT,
                added_by INTEGER,
                verified_at TIMESTAMP,
                status TEXT DEFAULT 'pending',
                verification_code TEXT,
                based_on TEXT,
                listed_status TEXT DEFAULT 'unlisted',
                price INTEGER DEFAULT 0,
                shape TEXT DEFAULT 'OP',
                kind TEXT DEFAULT 'MULCHAR INDO',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (added_by) REFERENCES users(user_id),
                FOREIGN KEY (owner_id) REFERENCES users(user_id)
            )
            """)
            
            # Tabel activity_log
            cur.execute("""
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                user_id INTEGER,
                action TEXT,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (username) REFERENCES added_usernames(username),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
            """)
            
            # Tabel verification_sessions
            cur.execute("""
            CREATE TABLE IF NOT EXISTS verification_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE,
                username TEXT,
                type TEXT,
                requester_id INTEGER,
                owner_id INTEGER,
                otp_code TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)
            
            # Tabel webapp_requests
            cur.execute("""
            CREATE TABLE IF NOT EXISTS webapp_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT UNIQUE,
                username TEXT,
                requester_id INTEGER,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)
    
    def migrate_add_shape_column(self):
        """Add shape column if not exists"""
        with self.get_connection() as cur:
            try:
                cur.execute("PRAGMA table_info(added_usernames)")
                columns = [column[1] for column in cur.fetchall()]
                
                if 'shape' not in columns:
                    print("🔄 Migrating database: Adding shape column...")
                    cur.execute("ALTER TABLE added_usernames ADD COLUMN shape TEXT DEFAULT 'OP'")
                    print("✅ Column shape added successfully")
                
                # Update existing records
                cur.execute("SELECT id, username, based_on FROM added_usernames WHERE shape IS NULL OR shape = ''")
                rows = cur.fetchall()
                
                print(f"\n🔍 Migrating {len(rows)} records...")
                
                for row in rows:
                    usn_id = row[0]
                    username = row[1]
                    based_on = row[2]
                    
                    shape = self.determine_shape_for_db(username, based_on)
                    print(f"  - @{username} (based_on: '{based_on}') → shape: {shape}")
                    
                    cur.execute("UPDATE added_usernames SET shape = ? WHERE id = ?", (shape, usn_id))
                
                print(f"✅ Updated {len(rows)} records with shape")
                
            except Exception as e:
                print(f"Error during migration: {e}")
    
    def migrate_add_kind_column(self):
        """Add kind column if not exists"""
        with self.get_connection() as cur:
            try:
                cur.execute("PRAGMA table_info(added_usernames)")
                columns = [column[1] for column in cur.fetchall()]
                
                if 'kind' not in columns:
                    print("🔄 Migrating database: Adding kind column...")
                    cur.execute("ALTER TABLE added_usernames ADD COLUMN kind TEXT DEFAULT 'MULCHAR INDO'")
                    print("✅ Column kind added successfully")
                
            except Exception as e:
                print(f"Error during kind migration: {e}")
    
    def determine_shape_for_db(self, username, based_on):
        """Determine username type based on rules"""
        if not based_on or not username:
            return "OP"
        
        username_lower = username.lower()
        based_on_no_spaces = based_on.replace(' ', '')
        based_on_lower = based_on_no_spaces.lower()
        
        # 1. OP (On Point)
        if username_lower == based_on_lower:
            return "OP"
        
        # 2. SCANON
        if username_lower == based_on_lower + 's':
            return "SCANON"
        
        # 3. SOP (Semi On Point)
        if len(based_on_lower) < len(username_lower):
            for i in range(len(based_on_lower)):
                if (based_on_lower[:i+1] + based_on_lower[i] + based_on_lower[i+1:]) == username_lower:
                    return "SOP"
        
        # 4. CANON
        if len(username_lower) == len(based_on_lower):
            is_canon = True
            diff_count = 0
            for a, b in zip(username_lower, based_on_lower):
                if a != b:
                    if (a == 'i' and b == 'l') or (a == 'l' and b == 'i'):
                        diff_count += 1
                    else:
                        is_canon = False
                        break
            if is_canon and diff_count > 0:
                return "CANON"
        
        # 5. TAMPING
        if len(username_lower) == len(based_on_lower) + 1:
            if username_lower.startswith(based_on_lower) or username_lower.endswith(based_on_lower):
                return "TAMPING"
        
        # 6. TAMDAL
        if len(username_lower) == len(based_on_lower) + 1:
            for i in range(len(based_on_lower)):
                if (username_lower.startswith(based_on_lower[:i]) and 
                    username_lower[i+1:].startswith(based_on_lower[i:])):
                    return "TAMDAL"
        
        # 7. GANHUR
        if len(username_lower) == len(based_on_lower):
            diff_count = 0
            for a, b in zip(username_lower, based_on_lower):
                if a != b:
                    diff_count += 1
            if diff_count == 1:
                return "GANHUR"
        
        # 8. SWITCH
        if len(username_lower) == len(based_on_lower):
            for i in range(len(based_on_lower) - 1):
                switched = based_on_lower[:i] + based_on_lower[i+1] + based_on_lower[i] + based_on_lower[i+2:]
                if switched == username_lower:
                    return "SWITCH"
        
        # 9. KURHUF
        if len(username_lower) == len(based_on_lower) - 1:
            for i in range(len(based_on_lower)):
                removed = based_on_lower[:i] + based_on_lower[i+1:]
                if removed == username_lower:
                    return "KURHUF"
        
        return "OP"
    
    def add_user(self, user_id, fullname, username=None):
        now = get_jakarta_time()
        with self.get_connection() as cur:
            cur.execute("""
            INSERT OR REPLACE INTO users (user_id, fullname, username, joined_at, first_start, last_start, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, fullname, username, now, now, now, now))
            
            self.add_activity_log(user_id, "USER_START", f"User memulai bot")
    
    def update_user_last_start(self, user_id):
        now = get_jakarta_time()
        with self.get_connection() as cur:
            cur.execute("""
            UPDATE users SET last_start = ?, updated_at = ? WHERE user_id = ?
            """, (now, now, user_id))
    
    def get_user(self, user_id):
        with self.get_connection() as cur:
            cur.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            return cur.fetchone()
    
    def get_user_by_username(self, username):
        if username.startswith('@'):
            username = username[1:]
        with self.get_connection() as cur:
            cur.execute("SELECT * FROM users WHERE username = ?", (username,))
            return cur.fetchone()
    
    def add_username_request(self, username, type_, owner_id, owner_username, added_by, shape=None):
        now = get_jakarta_time()
        if shape is None:
            shape = "OP"
        
        try:
            with self.get_connection() as cur:
                cur.execute("""
                INSERT INTO added_usernames (
                    username, type, owner_id, owner_username, added_by, 
                    verified_at, status, shape, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (username, type_, owner_id, owner_username, added_by, now, 'verified', shape, now))
                
                self.add_activity_log(added_by, "USERNAME_ADDED", 
                                      f"Menambahkan username @{username} (tipe: {type_}, shape: {shape})")
                
                return True
        except Exception as e:
            print(f"Error adding username request: {e}")
            return False
    
    def get_user_added_usernames(self, user_id):
        try:
            with self.get_connection() as cur:
                cur.execute("""
                SELECT 
                    id, username, type, owner_id, owner_username, added_by, 
                    verified_at, status, verification_code, based_on, 
                    listed_status, price, shape, kind, updated_at 
                FROM added_usernames 
                WHERE added_by = ? AND status = 'verified'
                ORDER BY verified_at DESC
                """, (user_id,))
                return cur.fetchall()
        except Exception as e:
            print(f"Error getting user added usernames: {e}")
            return []
    
    def get_listed_usernames(self):
        try:
            with self.get_connection() as cur:
                cur.execute("""
                SELECT 
                    id, username, type, owner_id, owner_username, added_by, 
                    verified_at, status, verification_code, based_on, 
                    listed_status, price, shape, kind, updated_at 
                FROM added_usernames 
                WHERE listed_status = 'listed' AND status = 'verified'
                ORDER BY updated_at DESC
                """)
                return cur.fetchall()
        except Exception as e:
            print(f"Error getting listed usernames: {e}")
            return []
    
    def get_all_based_on(self):
        try:
            with self.get_connection() as cur:
                cur.execute("""
                SELECT DISTINCT based_on FROM added_usernames 
                WHERE based_on IS NOT NULL AND based_on != ''
                ORDER BY based_on
                """)
                return [row[0] for row in cur.fetchall()]
        except Exception as e:
            print(f"Error getting based_on list: {e}")
            return []
    
    def get_username_detail(self, username):
        try:
            if username.startswith('@'):
                username = username[1:]
            
            with self.get_connection() as cur:
                cur.execute("""
                SELECT 
                    id, username, type, owner_id, owner_username, added_by, 
                    verified_at, status, verification_code, based_on, 
                    listed_status, price, shape, kind, updated_at 
                FROM added_usernames 
                WHERE username = ?
                """, (username,))
                
                return cur.fetchone()
        except Exception as e:
            print(f"Error getting username detail: {e}")
            return None
    
    def update_based_on(self, username, based_on):
        try:
            if username.startswith('@'):
                username = username[1:]
            
            now = get_jakarta_time()
            
            with self.get_connection() as cur:
                cur.execute("""
                UPDATE added_usernames 
                SET based_on = ?, updated_at = ? 
                WHERE username = ?
                """, (based_on, now, username))
                
                # Hitung shape berdasarkan based_on yang baru
                shape = self.determine_shape_for_db(username, based_on)
                
                cur.execute("""
                UPDATE added_usernames 
                SET shape = ? 
                WHERE username = ?
                """, (shape, username))
                
                # Log activity
                cur.execute("SELECT added_by FROM added_usernames WHERE username = ?", (username,))
                owner_result = cur.fetchone()
                if owner_result:
                    self.add_activity_log(owner_result[0], "BASED_ON_SET", 
                                          f"Mengatur based_on untuk @{username}: {based_on} (type: {shape})")
                
                print(f"✅ Based_on saved: '{based_on}', type: {shape}")
                return True
        except Exception as e:
            print(f"Error updating based_on: {e}")
            return False
    
    def update_listed_status(self, username, status):
        try:
            if username.startswith('@'):
                username = username[1:]
            
            now = get_jakarta_time()
            
            with self.get_connection() as cur:
                cur.execute("SELECT id, listed_status FROM added_usernames WHERE username = ?", (username,))
                result = cur.fetchone()
                
                if not result:
                    print(f"❌ Database: Username {username} tidak ditemukan!")
                    return False
                
                print(f"Database Before update - {username}: {result[1]}")
                
                cur.execute("""
                UPDATE added_usernames 
                SET listed_status = ?, updated_at = ? 
                WHERE username = ?
                """, (status, now, username))
                
                # Log activity
                cur.execute("SELECT added_by FROM added_usernames WHERE username = ?", (username,))
                owner_result = cur.fetchone()
                if owner_result:
                    self.add_activity_log(owner_result[0], "LISTED_STATUS", f"Mengubah status listed untuk @{username} menjadi {status}")
                
                print(f"✅ Database: Updated {username} status to {status}")
                return True
                
        except Exception as e:
            print(f"Error updating listed status: {e}")
            return False
    
    def update_price(self, username, price):
        try:
            if username.startswith('@'):
                username = username[1:]
            
            now = get_jakarta_time()
            
            with self.get_connection() as cur:
                cur.execute("""
                UPDATE added_usernames 
                SET price = ?, updated_at = ? 
                WHERE username = ?
                """, (price, now, username))
                
                cur.execute("SELECT added_by FROM added_usernames WHERE username = ?", (username,))
                result = cur.fetchone()
                if result:
                    self.add_activity_log(result[0], "PRICE_SET", f"Mengatur harga untuk @{username}: Rp {price:,}")
                
                return True
        except Exception as e:
            print(f"Error updating price: {e}")
            return False
    
    def add_activity_log(self, user_id, action, details):
        try:
            now = get_jakarta_time()
            with self.get_connection() as cur:
                cur.execute("""
                INSERT INTO activity_log (user_id, action, details, created_at)
                VALUES (?, ?, ?, ?)
                """, (user_id, action, details, now))
                return True
        except Exception as e:
            print(f"Error adding activity log: {e}")
            return False
    
    def get_all_activity_logs(self, page=1, limit=50):
        try:
            offset = (page - 1) * limit
            with self.get_connection() as cur:
                cur.execute("""
                SELECT * FROM activity_log 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
                """, (limit, offset))
                logs = cur.fetchall()
                
                cur.execute("SELECT COUNT(*) FROM activity_log")
                total = cur.fetchone()[0]
                
                return logs, total
        except Exception as e:
            print(f"Error getting all activity logs: {e}")
            return [], 0
    
    def get_activity_logs(self, user_id, page=1, limit=10):
        try:
            offset = (page - 1) * limit
            with self.get_connection() as cur:
                cur.execute("""
                SELECT * FROM activity_log 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
                """, (user_id, limit, offset))
                logs = cur.fetchall()
                
                cur.execute("SELECT COUNT(*) FROM activity_log WHERE user_id = ?", (user_id,))
                total = cur.fetchone()[0]
                
                return logs, total
        except Exception as e:
            print(f"Error getting activity logs: {e}")
            return [], 0
    
    def create_verification_session(self, session_id, username, type_, requester_id, owner_id=None, otp_code=None):
        now = get_jakarta_time()
        try:
            with self.get_connection() as cur:
                cur.execute("""
                INSERT INTO verification_sessions (session_id, username, type, requester_id, owner_id, otp_code, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (session_id, username, type_, requester_id, owner_id, otp_code, now, now))
                return session_id
        except Exception as e:
            print(f"Error creating verification session: {e}")
            return None
    
    def get_verification_session(self, session_id):
        with self.get_connection() as cur:
            cur.execute("SELECT * FROM verification_sessions WHERE session_id = ?", (session_id,))
            return cur.fetchone()
    
    def update_verification_session(self, session_id, **kwargs):
        updates = []
        values = []
        for key, value in kwargs.items():
            updates.append(f"{key} = ?")
            values.append(value)
        
        values.append(session_id)
        now = get_jakarta_time()
        updates.append("updated_at = ?")
        values.append(now)
        
        query = f"UPDATE verification_sessions SET {', '.join(updates)} WHERE session_id = ?"
        try:
            with self.get_connection() as cur:
                cur.execute(query, values)
                return True
        except Exception as e:
            print(f"Error updating session: {e}")
            return False
    
    def create_webapp_request(self, request_id, username, requester_id):
        try:
            now = get_jakarta_time()
            
            with self.get_connection() as cur:
                cur.execute("""
                INSERT INTO webapp_requests (request_id, username, requester_id, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, (request_id, username, requester_id, 'pending', now, now))
                
                print(f"✅ Webapp request saved: {request_id}")
                return True
        except Exception as e:
            print(f"❌ Error creating webapp request: {e}")
            return False
    
    def get_pending_webapp_requests(self, limit=10):
        try:
            with self.get_connection() as cur:
                cur.execute("""
                SELECT * FROM webapp_requests 
                WHERE status = 'pending'
                ORDER BY created_at ASC
                LIMIT ?
                """, (limit,))
                return cur.fetchall()
        except Exception as e:
            print(f"Error getting pending webapp requests: {e}")
            return []
    
    def get_user_pending_requests(self, user_id):
        try:
            with self.get_connection() as cur:
                cur.execute("""
                SELECT * FROM webapp_requests 
                WHERE requester_id = ? AND status = 'pending'
                ORDER BY created_at DESC
                """, (user_id,))
                return cur.fetchall()
        except Exception as e:
            print(f"Error getting user pending requests: {e}")
            return []
    
    def update_webapp_request_status(self, request_id, status):
        try:
            now = get_jakarta_time()
            with self.get_connection() as cur:
                cur.execute("""
                UPDATE webapp_requests 
                SET status = ?, updated_at = ? 
                WHERE request_id = ?
                """, (status, now, request_id))
                return True
        except Exception as e:
            print(f"Error updating webapp request: {e}")
            return False
    
    def generate_verification_id(self, length=25):
        chars = string.ascii_letters + string.digits
        return ''.join(random.choice(chars) for _ in range(length))
    
    def generate_otp(self):
        return ''.join(random.choice(string.digits) for _ in range(6))