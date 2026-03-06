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
            shape TEXT DEFAULT 'UNCOMMON',
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
        
        # Migrasi database lama jika kolom belum ada
        self.migrate_add_shape_column()

    def migrate_add_shape_column(self):
        try:
            # Cek apakah kolom sudah ada
            self.cur.execute("PRAGMA table_info(added_usernames)")
            columns = [column[1] for column in self.cur.fetchall()]
            
            if 'shape' not in columns:
                print("🔄 Migrating database: Adding shape column...")
                self.cur.execute("ALTER TABLE added_usernames ADD COLUMN shape TEXT DEFAULT 'UNCOMMON'")
                self.conn.commit()
                print("✅ Column shape added successfully")
            
            # Update existing records dengan type yang sesuai
            self.cur.execute("SELECT id, username, based_on FROM added_usernames WHERE shape IS NULL OR shape = ''")
            rows = self.cur.fetchall()
            
            for row in rows:
                usn_id = row[0]
                username = row[1]
                based_on = row[2]
                
                # Hitung type berdasarkan username dan based_on
                shape = self.determine_shape_for_db(username, based_on)
                
                self.cur.execute("UPDATE added_usernames SET shape = ? WHERE id = ?", (shape, usn_id))
            
            self.conn.commit()
            print(f"✅ Updated {len(rows)} records with shape")
            
        except Exception as e:
            print(f"Error during migration: {e}")

    def determine_shape_for_db(self, username, based_on):
        """Determine username type based on rules (sama seperti di app.py)"""
        if not based_on or not username:
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
        if len(username_lower) == len(based_on_lower):
            canon_possible = True
            for a, b in zip(username_lower, based_on_lower):
                if (a == 'l' and b == 'i') or (a == 'i' and b == 'l'):
                    continue
                elif a != b:
                    canon_possible = False
                    break
            if canon_possible:
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
        
        # Jika shape tidak diberikan, hitung otomatis (default UNCOMMON)
        if shape is None:
            shape = "UNCOMMON"
        
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
        """Get all usernames added by a specific user (termasuk shape)"""
        try:
            self.cur.execute("""
            SELECT 
                id, username, type, owner_id, owner_username, added_by, 
                verified_at, status, verification_code, based_on, 
                listed_status, price, shape, updated_at 
            FROM added_usernames 
            WHERE added_by = ? AND status = 'verified'
            ORDER BY verified_at DESC
            """, (user_id,))
            return self.cur.fetchall()
        except Exception as e:
            print(f"Error getting user added usernames: {e}")
            return []
    
    def get_listed_usernames(self):
        """Get all usernames with listed status (termasuk shape)"""
        try:
            self.cur.execute("""
            SELECT 
                id, username, type, owner_id, owner_username, added_by, 
                verified_at, status, verification_code, based_on, 
                listed_status, price, shape, updated_at 
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
        """Get detailed info about a specific username (dengan shape)"""
        try:
            # Clean username if needed
            if username.startswith('@'):
                username = username[1:]
            
            # Ambil semua kolom termasuk shape
            self.cur.execute("""
            SELECT 
                id, username, type, owner_id, owner_username, added_by, 
                verified_at, status, verification_code, based_on, 
                listed_status, price, shape, updated_at 
            FROM added_usernames 
            WHERE username = ?
            """, (username,))
            
            result = self.cur.fetchone()
            
            # Debug: tampilkan hasil
            if result:
                print(f"get_username_detail for {username}:")
                print(f"  listed_status = {result[10]} (index 10)")
                print(f"  price = {result[11]} (index 11)")
                print(f"  shape = {result[12]} (index 12)")  # KOLOM BARU
                print(f"  updated_at = {result[13]} (index 13)")
            
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
    
    def generate_verification_id(self, length=25):
        chars = string.ascii_letters + string.digits
        return ''.join(random.choice(chars) for _ in range(length))
    
    def generate_otp(self):
        return ''.join(random.choice(string.digits) for _ in range(6))
    
    def close(self):
        self.conn.close()