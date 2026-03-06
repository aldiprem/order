import sqlite3
import datetime
import random
import string
import pytz

# Set timezone Asia/Jakarta (WIB)
JAKARTA_TZ = pytz.timezone('Asia/Jakarta')

def get_jakarta_time():
    """Get current time in Asia/Jakarta timezone"""
    return datetime.datetime.now(JAKARTA_TZ).replace(tzinfo=None)

class Database:
    def __init__(self, db_path="database/indotag.db"):
        # Ensure database directory exists
        import os
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.cur = self.conn.cursor()
        self.create_tables()
    
    def create_tables(self):
        # Tabel users
        self.cur.execute("""
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
        
        self.cur.execute("""
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
        
        self.cur.execute("""
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
        
        # Tabel verification_sessions (menyimpan sesi verifikasi)
        self.cur.execute("""
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
        
        self.conn.commit()
        
        self.migrate_add_shape_column()
        self.migrate_add_kind_column()

    def migrate_add_kind_column(self):
        """Add kind column to existing tables if not exists"""
        try:
            # Cek apakah kolom sudah ada
            self.cur.execute("PRAGMA table_info(added_usernames)")
            columns = [column[1] for column in self.cur.fetchall()]
            
            if 'kind' not in columns:
                print("🔄 Migrating database: Adding kind column...")
                self.cur.execute("ALTER TABLE added_usernames ADD COLUMN kind TEXT DEFAULT 'MULCHAR INDO'")
                self.conn.commit()
                print("✅ Column kind added successfully")
            
        except Exception as e:
            print(f"Error during kind migration: {e}")

    def get_username_kind(self, username):
        """Get kind value for a username"""
        try:
            if username.startswith('@'):
                username = username[1:]
            
            self.cur.execute("SELECT kind FROM added_usernames WHERE username = ?", (username,))
            result = self.cur.fetchone()
            return result[0] if result else "MULCHAR INDO"
        except Exception as e:
            print(f"Error getting username kind: {e}")
            return "MULCHAR INDO"
    
    def update_kind(self, username, kind):
        """Update kind value for a username"""
        try:
            if username.startswith('@'):
                username = username[1:]
            
            now = get_jakarta_time()
            
            self.cur.execute("""
            UPDATE added_usernames 
            SET kind = ?, updated_at = ? 
            WHERE username = ?
            """, (kind, now, username))
            self.conn.commit()
            
            # Log activity
            self.cur.execute("SELECT added_by FROM added_usernames WHERE username = ?", (username,))
            owner_result = self.cur.fetchone()
            if owner_result:
                self.add_activity_log(owner_result[0], "KIND_SET", 
                                      f"Mengatur kind untuk @{username}: {kind}")
            
            print(f"✅ Kind saved: '{kind}' for @{username}")
            return True
        except Exception as e:
            print(f"Error updating kind: {e}")
            return False

    def migrate_add_shape_column(self):
        try:
            # Cek apakah kolom sudah ada
            self.cur.execute("PRAGMA table_info(added_usernames)")
            columns = [column[1] for column in self.cur.fetchall()]
            
            if 'shape' not in columns:
                print("🔄 Migrating database: Adding shape column...")
                self.cur.execute("ALTER TABLE added_usernames ADD COLUMN shape TEXT DEFAULT 'OP'")
                self.conn.commit()
                print("✅ Column shape added successfully")
            
            # Update existing records dengan type yang sesuai
            self.cur.execute("SELECT id, username, based_on FROM added_usernames WHERE shape IS NULL OR shape = ''")
            rows = self.cur.fetchall()
            
            print(f"\n🔍 Migrating {len(rows)} records...")
            
            for row in rows:
                usn_id = row[0]
                username = row[1]
                based_on = row[2]
                
                # Hitung type berdasarkan username dan based_on
                shape = self.determine_shape_for_db(username, based_on)
                
                print(f"  - @{username} (based_on: '{based_on}') → shape: {shape}")
                
                self.cur.execute("UPDATE added_usernames SET shape = ? WHERE id = ?", (shape, usn_id))
            
            self.conn.commit()
            print(f"✅ Updated {len(rows)} records with shape")
            
        except Exception as e:
            print(f"Error during migration: {e}")

    def determine_shape_for_db(self, username, based_on):
        """Determine username type based on rules (HARUS SAMA PERSIS dengan b.py)"""
        if not based_on or not username:
            return "OP"
        
        username_lower = username.lower()
        
        # PENTING: Hapus spasi dari based_on untuk perbandingan (sama seperti di b.py)
        based_on_no_spaces = based_on.replace(' ', '')
        based_on_lower = based_on_no_spaces.lower()
        
        # 1. CEK OP (On Point) - tanpa perubahan (setelah spasi dihapus)
        if username_lower == based_on_lower:
            return "OP"
        
        # 2. CEK SCANON - penambahan 's' di akhir
        if username_lower == based_on_lower + 's':
            return "SCANON"
        
        # 3. CEK SOP (Semi On Point) - double letters
        if len(based_on_lower) < len(username_lower):
            for i in range(len(based_on_lower)):
                if (based_on_lower[:i+1] + based_on_lower[i] + based_on_lower[i+1:]) == username_lower:
                    return "SOP"
        
        # 4. CEK CANON - penggantian i ke l atau l ke i
        if len(username_lower) == len(based_on_lower):
            is_canon = True
            diff_count = 0
            for a, b in zip(username_lower, based_on_lower):
                if a != b:
                    # Cek apakah perbedaan adalah i↔l
                    if (a == 'i' and b == 'l') or (a == 'l' and b == 'i'):
                        diff_count += 1
                    else:
                        is_canon = False
                        break
            if is_canon and diff_count > 0:
                return "CANON"
        
        # 5. CEK TAMPING (Tambah Pinggir)
        if len(username_lower) == len(based_on_lower) + 1:
            if username_lower.startswith(based_on_lower) or username_lower.endswith(based_on_lower):
                return "TAMPING"
        
        # 6. CEK TAMDAL (Tambah Dalam)
        if len(username_lower) == len(based_on_lower) + 1:
            for i in range(len(based_on_lower)):
                if (username_lower.startswith(based_on_lower[:i]) and 
                    username_lower[i+1:].startswith(based_on_lower[i:])):
                    return "TAMDAL"
        
        # 7. CEK GANHUR (Ganti Huruf)
        if len(username_lower) == len(based_on_lower):
            diff_count = 0
            for a, b in zip(username_lower, based_on_lower):
                if a != b:
                    diff_count += 1
            if diff_count == 1:
                return "GANHUR"
        
        # 8. CEK SWITCH (Perpindahan Huruf)
        if len(username_lower) == len(based_on_lower):
            for i in range(len(based_on_lower) - 1):
                switched = based_on_lower[:i] + based_on_lower[i+1] + based_on_lower[i] + based_on_lower[i+2:]
                if switched == username_lower:
                    return "SWITCH"
        
        # 9. CEK KURHUF (Kurang Huruf)
        if len(username_lower) == len(based_on_lower) - 1:
            for i in range(len(based_on_lower)):
                removed = based_on_lower[:i] + based_on_lower[i+1:]
                if removed == username_lower:
                    return "KURHUF"
        
        return "OP"

    def add_user(self, user_id, fullname, username=None):
        now = get_jakarta_time()
        self.cur.execute("""
        INSERT OR REPLACE INTO users (user_id, fullname, username, joined_at, first_start, last_start, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user_id, fullname, username, now, now, now, now))
        self.conn.commit()
        
        # Log activity
        self.add_activity_log(user_id, "USER_START", f"User memulai bot")
    
    def update_user_last_start(self, user_id):
        now = get_jakarta_time()
        self.cur.execute("""
        UPDATE users SET last_start = ?, updated_at = ? WHERE user_id = ?
        """, (now, now, user_id))
        self.conn.commit()
    
    def get_user(self, user_id):
        self.cur.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        return self.cur.fetchone()
    
    def get_user_by_username(self, username):
        if username.startswith('@'):
            username = username[1:]
        self.cur.execute("SELECT * FROM users WHERE username = ?", (username,))
        return self.cur.fetchone()
    
    def add_username_request(self, username, type_, owner_id, owner_username, added_by, shape=None):
        """Add username with type detection"""
        now = get_jakarta_time()
        
        if shape is None:
            shape = "OP"
        
        try:
            self.cur.execute("""
            INSERT INTO added_usernames (
                username, type, owner_id, owner_username, added_by, 
                verified_at, status, shape, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (username, type_, owner_id, owner_username, added_by, now, 'verified', shape, now))
            self.conn.commit()
            
            # Log activity
            self.add_activity_log(added_by, "USERNAME_ADDED", 
                                  f"Menambahkan username @{username} (tipe: {type_}, shape: {shape})")
            
            return True
        except Exception as e:
            print(f"Error adding username request: {e}")
            return False

    def get_user_added_usernames(self, user_id):
        """Get all usernames added by a specific user (termasuk shape dan kind)"""
        try:
            self.cur.execute("""
            SELECT 
                id, username, type, owner_id, owner_username, added_by, 
                verified_at, status, verification_code, based_on, 
                listed_status, price, shape, kind, updated_at 
            FROM added_usernames 
            WHERE added_by = ? AND status = 'verified'
            ORDER BY verified_at DESC
            """, (user_id,))
            return self.cur.fetchall()
        except Exception as e:
            print(f"Error getting user added usernames: {e}")
            return []
    
    def get_listed_usernames(self):
        """Get all usernames with listed status (termasuk shape dan kind)"""
        try:
            self.cur.execute("""
            SELECT 
                id, username, type, owner_id, owner_username, added_by, 
                verified_at, status, verification_code, based_on, 
                listed_status, price, shape, kind, updated_at 
            FROM added_usernames 
            WHERE listed_status = 'listed' AND status = 'verified'
            ORDER BY updated_at DESC
            """)
            return self.cur.fetchall()
        except Exception as e:
            print(f"Error getting listed usernames: {e}")
            return []
    
    def get_all_based_on(self):
        """Get all unique based_on values"""
        try:
            self.cur.execute("""
            SELECT DISTINCT based_on FROM added_usernames 
            WHERE based_on IS NOT NULL AND based_on != ''
            ORDER BY based_on
            """)
            return [row[0] for row in self.cur.fetchall()]
        except Exception as e:
            print(f"Error getting based_on list: {e}")
            return []
    
    def get_username_detail(self, username):
        """Get detailed info about a specific username (dengan shape dan kind)"""
        try:
            # Clean username if needed
            if username.startswith('@'):
                username = username[1:]
            
            # Ambil semua kolom termasuk shape dan kind
            self.cur.execute("""
            SELECT 
                id, username, type, owner_id, owner_username, added_by, 
                verified_at, status, verification_code, based_on, 
                listed_status, price, shape, kind, updated_at 
            FROM added_usernames 
            WHERE username = ?
            """, (username,))
            
            result = self.cur.fetchone()
            
            # Debug: tampilkan hasil dengan detail
            if result:
                print(f"\n🔍 DATABASE QUERY RESULT for @{username}:")
                print(f"  id: {result[0]}")
                print(f"  username: {result[1]}")
                print(f"  type: {result[2]}")
                print(f"  based_on: '{result[9]}'")
                print(f"  shape: {result[12]} (index 12)")
                print(f"  kind: {result[13]} (index 13)")  # KOLOM KIND
                print(f"  updated_at: {result[14]}")
            
            return result
        except Exception as e:
            print(f"Error getting username detail: {e}")
            return None
    
    def update_based_on(self, username, based_on):
        """Update based_on value for a username dan update shape"""
        try:
            if username.startswith('@'):
                username = username[1:]
            
            now = get_jakarta_time()
            
            # Update based_on
            self.cur.execute("""
            UPDATE added_usernames 
            SET based_on = ?, updated_at = ? 
            WHERE username = ?
            """, (based_on, now, username))
            
            # Ambil username untuk menghitung type
            self.cur.execute("SELECT username FROM added_usernames WHERE username = ?", (username,))
            result = self.cur.fetchone()
            
            if result:
                usn = result[0]
                # Hitung shape berdasarkan based_on yang baru
                shape = self.determine_shape_for_db(usn, based_on)
                
                # DEBUG: Lihat perbandingan
                print(f"\n🔍 DEBUG - Calculating shape for @{username}:")
                print(f"  Username: {usn}")
                print(f"  Based_on: '{based_on}'")
                print(f"  Shape result: {shape}")
                
                # Update shape
                self.cur.execute("""
                UPDATE added_usernames 
                SET shape = ? 
                WHERE username = ?
                """, (shape, username))
            
            self.conn.commit()
            
            # Log activity
            self.cur.execute("SELECT added_by FROM added_usernames WHERE username = ?", (username,))
            owner_result = self.cur.fetchone()
            if owner_result:
                self.add_activity_log(owner_result[0], "BASED_ON_SET", 
                                      f"Mengatur based_on untuk @{username}: {based_on} (type: {shape})")
            
            print(f"✅ Based_on saved with spaces: '{based_on}', type: {shape}")
            return True
        except Exception as e:
            print(f"Error updating based_on: {e}")
            return False
    
    def update_listed_status(self, username, status):
        """Update listed/unlisted status for a username"""
        try:
            if username.startswith('@'):
                username = username[1:]
            
            now = get_jakarta_time()
            
            # Cek dulu apakah username ada
            self.cur.execute("SELECT id, listed_status FROM added_usernames WHERE username = ?", (username,))
            result = self.cur.fetchone()
            
            if not result:
                print(f"❌ Database: Username {username} tidak ditemukan!")
                return False
            
            print(f"Database Before update - {username}: {result[1]}")
            
            # Lakukan update dengan pendekatan yang lebih sederhana
            self.cur.execute("""
            UPDATE added_usernames 
            SET listed_status = ?, updated_at = ? 
            WHERE username = ?
            """, (status, now, username))
            
            # Commit perubahan
            self.conn.commit()
            
            # Verifikasi setelah update dengan query terpisah
            self.cur.execute("SELECT listed_status FROM added_usernames WHERE username = ?", (username,))
            after = self.cur.fetchone()
            print(f"Database After update - {username}: {after[0] if after else 'None'}")
            
            # Cek apakah update berhasil dengan membandingkan nilai
            if after and after[0] == status:
                # Log activity
                self.cur.execute("SELECT added_by FROM added_usernames WHERE username = ?", (username,))
                owner_result = self.cur.fetchone()
                if owner_result:
                    self.add_activity_log(owner_result[0], "LISTED_STATUS", f"Mengubah status listed untuk @{username} menjadi {status}")
                
                print(f"✅ Database: Updated {username} status to {status}")
                return True
            else:
                print(f"❌ Database: Failed to update {username} status")
                return False
                
        except Exception as e:
            print(f"Error updating listed status: {e}")
            self.conn.rollback()  # Rollback jika terjadi error
            return False
    
    def update_price(self, username, price):
        """Update price for a username"""
        try:
            if username.startswith('@'):
                username = username[1:]
            
            now = get_jakarta_time()
            self.cur.execute("""
            UPDATE added_usernames 
            SET price = ?, updated_at = ? 
            WHERE username = ?
            """, (price, now, username))
            self.conn.commit()
            
            # Log activity
            self.cur.execute("SELECT added_by FROM added_usernames WHERE username = ?", (username,))
            result = self.cur.fetchone()
            if result:
                self.add_activity_log(result[0], "PRICE_SET", f"Mengatur harga untuk @{username}: Rp {price:,}")
            
            return True
        except Exception as e:
            print(f"Error updating price: {e}")
            return False
    
    def add_activity_log(self, user_id, action, details):
        """Add activity log entry"""
        try:
            now = get_jakarta_time()
            self.cur.execute("""
            INSERT INTO activity_log (user_id, action, details, created_at)
            VALUES (?, ?, ?, ?)
            """, (user_id, action, details, now))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error adding activity log: {e}")
            return False

    def get_all_activity_logs(self, page=1, limit=50):
        """Get all activity logs with pagination"""
        try:
            offset = (page - 1) * limit
            self.cur.execute("""
            SELECT * FROM activity_log 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
            """, (limit, offset))
            logs = self.cur.fetchall()
            
            # Get total count for pagination
            self.cur.execute("SELECT COUNT(*) FROM activity_log")
            total = self.cur.fetchone()[0]
            
            return logs, total
        except Exception as e:
            print(f"Error getting all activity logs: {e}")
            return [], 0

    def get_activity_logs(self, user_id, page=1, limit=10):
        """Get activity logs for a user with pagination"""
        try:
            offset = (page - 1) * limit
            self.cur.execute("""
            SELECT * FROM activity_log 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
            """, (user_id, limit, offset))
            logs = self.cur.fetchall()
            
            # Get total count for pagination
            self.cur.execute("SELECT COUNT(*) FROM activity_log WHERE user_id = ?", (user_id,))
            total = self.cur.fetchone()[0]
            
            return logs, total
        except Exception as e:
            print(f"Error getting activity logs: {e}")
            return [], 0

    def create_verification_session(self, session_id, username, type_, requester_id, owner_id=None, otp_code=None):
        now = get_jakarta_time()
        try:
            self.cur.execute("""
            INSERT INTO verification_sessions (session_id, username, type, requester_id, owner_id, otp_code, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (session_id, username, type_, requester_id, owner_id, otp_code, now, now))
            self.conn.commit()
            return session_id
        except Exception as e:
            print(f"Error creating verification session: {e}")
            return None
    
    def get_verification_session(self, session_id):
        self.cur.execute("SELECT * FROM verification_sessions WHERE session_id = ?", (session_id,))
        return self.cur.fetchone()
    
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
            self.cur.execute(query, values)
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error updating session: {e}")
            return False

    def create_webapp_request(self, request_id, username, requester_id):
        """Create a pending request from web app"""
        try:
            now = get_jakarta_time()
            
            # Pastikan tabel ada
            self.cur.execute("""
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
            self.conn.commit()
            print(f"✅ Table webapp_requests created/verified")
            
            # Insert data
            print(f"Inserting: request_id={request_id}, username={username}, requester_id={requester_id}")
            
            self.cur.execute("""
            INSERT INTO webapp_requests (request_id, username, requester_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (request_id, username, requester_id, 'pending', now, now))
            
            self.conn.commit()
            
            # Verifikasi
            self.cur.execute("SELECT * FROM webapp_requests WHERE request_id = ?", (request_id,))
            result = self.cur.fetchone()
            if result:
                print(f"✅ Data verified in database: {result}")
            else:
                print(f"❌ Data not found after insert!")
            
            return True
        except Exception as e:
            print(f"❌ Error creating webapp request: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def get_pending_webapp_requests(self, limit=10):
        """Get pending requests from web app that need to be processed by bot"""
        try:
            self.cur.execute("""
            SELECT * FROM webapp_requests 
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT ?
            """, (limit,))
            return self.cur.fetchall()
        except Exception as e:
            print(f"Error getting pending webapp requests: {e}")
            return []
    
    def get_user_pending_requests(self, user_id):
        """Get pending requests for a specific user"""
        try:
            self.cur.execute("""
            SELECT * FROM webapp_requests 
            WHERE requester_id = ? AND status = 'pending'
            ORDER BY created_at DESC
            """, (user_id,))
            return self.cur.fetchall()
        except Exception as e:
            print(f"Error getting user pending requests: {e}")
            return []
    
    def update_webapp_request_status(self, request_id, status):
        """Update status of webapp request"""
        try:
            now = get_jakarta_time()
            self.cur.execute("""
            UPDATE webapp_requests 
            SET status = ?, updated_at = ? 
            WHERE request_id = ?
            """, (status, now, request_id))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error updating webapp request: {e}")
            return False

    def generate_verification_id(self, length=25):
        chars = string.ascii_letters + string.digits
        return ''.join(random.choice(chars) for _ in range(length))
    
    def generate_otp(self):
        return ''.join(random.choice(string.digits) for _ in range(6))
    
    def close(self):
        self.conn.close()