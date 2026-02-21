import sqlite3
import os
from datetime import datetime
import hashlib
import secrets

class Database:
    def __init__(self, db_name="users.db"):
        self.db_name = db_name
        self.init_database()
    
    def get_connection(self):
        """Membuat koneksi ke database"""
        conn = sqlite3.connect(self.db_name)
        conn.row_factory = sqlite3.Row  # Mengembalikan hasil sebagai dictionary
        return conn
    
    def init_database(self):
        """Inisialisasi tabel database jika belum ada"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Buat tabel users
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT,
                full_name TEXT,
                google_id TEXT UNIQUE,
                profile_picture TEXT,
                is_google_user BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        ''')
        
        # Buat tabel sessions untuk menyimpan session token
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        conn.commit()
        conn.close()
        print("Database initialized successfully!")
    
    def hash_password(self, password):
        """Hash password menggunakan SHA-256 (untuk development, gunakan bcrypt di production)"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def generate_session_token(self):
        """Generate unique session token"""
        return secrets.token_urlsafe(32)
    
    def create_user(self, username, email, password=None, google_id=None, full_name=None, profile_picture=None):
        """Membuat user baru"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            hashed_password = self.hash_password(password) if password else None
            
            cursor.execute('''
                INSERT INTO users (username, email, password, google_id, full_name, profile_picture, is_google_user, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                username, 
                email, 
                hashed_password, 
                google_id, 
                full_name, 
                profile_picture,
                1 if google_id else 0,
                datetime.now()
            ))
            
            conn.commit()
            user_id = cursor.lastrowid
            
            conn.close()
            return self.get_user_by_id(user_id)
            
        except sqlite3.IntegrityError as e:
            conn.close()
            if "UNIQUE constraint failed: users.username" in str(e):
                return {"error": "Username already exists"}
            elif "UNIQUE constraint failed: users.email" in str(e):
                return {"error": "Email already exists"}
            elif "UNIQUE constraint failed: users.google_id" in str(e):
                return {"error": "Google account already registered"}
            else:
                return {"error": str(e)}
    
    def get_user_by_email(self, email):
        """Mendapatkan user berdasarkan email"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        conn.close()
        
        return dict(user) if user else None
    
    def get_user_by_username(self, username):
        """Mendapatkan user berdasarkan username"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        conn.close()
        
        return dict(user) if user else None
    
    def get_user_by_id(self, user_id):
        """Mendapatkan user berdasarkan ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        conn.close()
        
        return dict(user) if user else None
    
    def get_user_by_google_id(self, google_id):
        """Mendapatkan user berdasarkan Google ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM users WHERE google_id = ?", (google_id,))
        user = cursor.fetchone()
        conn.close()
        
        return dict(user) if user else None
    
    def get_user_by_identifier(self, identifier):
        """Mendapatkan user berdasarkan username atau email"""
        user = self.get_user_by_email(identifier)
        if not user:
            user = self.get_user_by_username(identifier)
        return user
    
    def verify_password(self, email, password):
        """Verifikasi password user"""
        user = self.get_user_by_email(email)
        if user and user['password']:
            hashed_input = self.hash_password(password)
            return hashed_input == user['password']
        return False
    
    def create_session(self, user_id):
        """Membuat session baru untuk user"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        session_token = self.generate_session_token()
        
        # Session berlaku selama 7 hari
        from datetime import timedelta
        expires_at = datetime.now() + timedelta(days=7)
        
        cursor.execute('''
            INSERT INTO sessions (user_id, session_token, expires_at)
            VALUES (?, ?, ?)
        ''', (user_id, session_token, expires_at))
        
        # Update last login
        cursor.execute('''
            UPDATE users SET last_login = ? WHERE id = ?
        ''', (datetime.now(), user_id))
        
        conn.commit()
        conn.close()
        
        return session_token
    
    def verify_session(self, session_token):
        """Verifikasi session token"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT s.*, u.* FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > ?
        ''', (session_token, datetime.now()))
        
        session = cursor.fetchone()
        conn.close()
        
        return dict(session) if session else None
    
    def delete_session(self, session_token):
        """Menghapus session (logout)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM sessions WHERE session_token = ?", (session_token,))
        conn.commit()
        conn.close()
    
    def delete_user_sessions(self, user_id):
        """Menghapus semua session user"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()
    
    def get_all_users(self):
        """Mendapatkan semua user (untuk debugging)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, username, email, full_name, is_google_user, created_at, last_login FROM users")
        users = cursor.fetchall()
        conn.close()
        
        return [dict(user) for user in users]

# Buat instance database global
db = Database()
