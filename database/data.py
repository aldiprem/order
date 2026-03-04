import sqlite3
import datetime
import random
import string

class Database:
    def __init__(self, db_path="database/indotag.db"):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
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
        
        # Tabel username_added (menyimpan username yang diadd)
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
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(user_id),
            FOREIGN KEY (owner_id) REFERENCES users(user_id)
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
    
    def add_user(self, user_id, fullname, username=None):
        now = datetime.datetime.now()
        self.cur.execute("""
        INSERT OR REPLACE INTO users (user_id, fullname, username, joined_at, first_start, last_start, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user_id, fullname, username, now, now, now, now))
        self.conn.commit()
    
    def update_user_last_start(self, user_id):
        now = datetime.datetime.now()
        self.cur.execute("""
        UPDATE users SET last_start = ?, updated_at = ? WHERE user_id = ?
        """, (now, now, user_id))
        self.conn.commit()
    
    def get_user(self, user_id):
        self.cur.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        return self.cur.fetchone()
    
    def get_user_by_username(self, username):
        self.cur.execute("SELECT * FROM users WHERE username = ?", (username,))
        return self.cur.fetchone()
    
    def add_username_request(self, username, type_, owner_id, owner_username, added_by):
        now = datetime.datetime.now()
        try:
            self.cur.execute("""
            INSERT INTO added_usernames (username, type, owner_id, owner_username, added_by, verified_at, status, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (username, type_, owner_id, owner_username, added_by, now, 'verified', now))
            self.conn.commit()
            return True
        except:
            return False

    def get_user_added_usernames(self, user_id):
        """Get all usernames added by a specific user"""
        try:
            self.cur.execute("""
            SELECT * FROM added_usernames 
            WHERE added_by = ? AND status = 'verified'
            ORDER BY verified_at DESC
            """, (user_id,))
            return self.cur.fetchall()
        except Exception as e:
            print(f"Error getting user added usernames: {e}")
            return []
    
    def get_username_detail(self, username):
        """Get detailed info about a specific username"""
        try:
            # Clean username if needed
            if username.startswith('@'):
                username = username[1:]
                
            self.cur.execute("""
            SELECT * FROM added_usernames 
            WHERE username = ?
            """, (username,))
            return self.cur.fetchone()
        except Exception as e:
            print(f"Error getting username detail: {e}")
            return None

    def create_verification_session(self, session_id, username, type_, requester_id, owner_id=None, otp_code=None):
        now = datetime.datetime.now()
        self.cur.execute("""
        INSERT INTO verification_sessions (session_id, username, type, requester_id, owner_id, otp_code, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (session_id, username, type_, requester_id, owner_id, otp_code, now, now))
        self.conn.commit()
        return session_id
    
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
        now = datetime.datetime.now()
        updates.append("updated_at = ?")
        values.append(now)
        
        query = f"UPDATE verification_sessions SET {', '.join(updates)} WHERE session_id = ?"
        self.cur.execute(query, values)
        self.conn.commit()
    
    def generate_verification_id(self, length=25):
        chars = string.ascii_letters + string.digits
        return ''.join(random.choice(chars) for _ in range(length))
    
    def generate_otp(self):
        return ''.join(random.choice(string.digits) for _ in range(6))
    
    def close(self):
        self.conn.close()
