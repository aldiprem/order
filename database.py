import sqlite3
import json
from datetime import datetime
import os

class Database:
    def __init__(self, db_name='telegram_users.db'):
        self.db_name = db_name
        self.init_db()
    
    def get_connection(self):
        """Mendapatkan koneksi database"""
        conn = sqlite3.connect(self.db_name)
        conn.row_factory = sqlite3.Row  # Mengembalikan hasil sebagai dictionary
        return conn
    
    def init_db(self):
        """Inisialisasi tabel database"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Tabel users - menyimpan data user Telegram + akun yang dibuat
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER UNIQUE,
                telegram_username TEXT,
                first_name TEXT,
                last_name TEXT,
                language_code TEXT,
                is_premium BOOLEAN DEFAULT 0,
                photo_url TEXT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )
        ''')
        
        # Tabel sessions - untuk menyimpan session login
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                session_token TEXT UNIQUE,
                telegram_data TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Tabel login_history - riwayat login
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS login_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                login_type TEXT,  -- 'telegram', 'manual', 'register'
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        conn.commit()
        conn.close()
        print("✅ Database initialized successfully")
    
    # ==================== USER OPERATIONS ====================
    
    def create_user(self, telegram_data, form_data):
        """
        Membuat user baru dengan menggabungkan data Telegram dan form
        telegram_data: data dari Telegram WebApp
        form_data: username, email, password dari form
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Ekstrak data Telegram
            telegram_id = telegram_data.get('id')
            telegram_username = telegram_data.get('username')
            first_name = telegram_data.get('first_name')
            last_name = telegram_data.get('last_name')
            language_code = telegram_data.get('language_code')
            is_premium = 1 if telegram_data.get('is_premium') else 0
            photo_url = telegram_data.get('photo_url')
            
            # Data dari form
            username = form_data.get('username')
            email = form_data.get('email')
            password = form_data.get('password')  # TODO: Hash password!
            
            cursor.execute('''
                INSERT INTO users (
                    telegram_id, telegram_username, first_name, last_name, 
                    language_code, is_premium, photo_url, username, email, password
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                telegram_id, telegram_username, first_name, last_name,
                language_code, is_premium, photo_url, username, email, password
            ))
            
            conn.commit()
            user_id = cursor.lastrowid
            
            # Catat history registrasi
            self.add_login_history(user_id, 'register', form_data.get('ip'), form_data.get('user_agent'))
            
            return {'success': True, 'user_id': user_id, 'message': 'User created successfully'}
            
        except sqlite3.IntegrityError as e:
            if 'UNIQUE constraint failed' in str(e):
                if 'username' in str(e):
                    return {'success': False, 'message': 'Username already exists'}
                elif 'email' in str(e):
                    return {'success': False, 'message': 'Email already exists'}
                elif 'telegram_id' in str(e):
                    return {'success': False, 'message': 'Telegram account already registered'}
            return {'success': False, 'message': str(e)}
        except Exception as e:
            return {'success': False, 'message': str(e)}
        finally:
            conn.close()
    
    def get_user_by_telegram_id(self, telegram_id):
        """Mendapatkan user berdasarkan Telegram ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE telegram_id = ?', (telegram_id,))
        user = cursor.fetchone()
        
        conn.close()
        return dict(user) if user else None
    
    def get_user_by_username(self, username):
        """Mendapatkan user berdasarkan username"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()
        
        conn.close()
        return dict(user) if user else None
    
    def get_user_by_email(self, email):
        """Mendapatkan user berdasarkan email"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        
        conn.close()
        return dict(user) if user else None
    
    def verify_login(self, username_or_email, password):
        """Verifikasi login manual (tanpa Telegram)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Cek berdasarkan username atau email
        cursor.execute('''
            SELECT * FROM users 
            WHERE (username = ? OR email = ?) AND password = ? AND is_active = 1
        ''', (username_or_email, username_or_email, password))
        
        user = cursor.fetchone()
        conn.close()
        
        return dict(user) if user else None
    
    def update_last_login(self, user_id, ip=None, user_agent=None):
        """Update last login dan catat history"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE users SET last_login = CURRENT_TIMESTAMP 
            WHERE id = ?
        ''', (user_id,))
        
        conn.commit()
        conn.close()
        
        # Catat history login
        self.add_login_history(user_id, 'login', ip, user_agent)
    
    # ==================== SESSION OPERATIONS ====================
    
    def create_session(self, user_id, telegram_data, session_token, ip=None, user_agent=None, expires_in_days=7):
        """Membuat session baru untuk user"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Hapus session lama
        cursor.execute('DELETE FROM sessions WHERE user_id = ?', (user_id,))
        
        # Buat session baru
        import datetime
        expires_at = (datetime.datetime.now() + datetime.timedelta(days=expires_in_days)).strftime('%Y-%m-%d %H:%M:%S')
        
        cursor.execute('''
            INSERT INTO sessions (user_id, session_token, telegram_data, ip_address, user_agent, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, session_token, json.dumps(telegram_data), ip, user_agent, expires_at))
        
        conn.commit()
        session_id = cursor.lastrowid
        conn.close()
        
        return session_id
    
    def get_session(self, session_token):
        """Mendapatkan session berdasarkan token"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT s.*, u.* FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
        ''', (session_token,))
        
        session = cursor.fetchone()
        conn.close()
        
        return dict(session) if session else None
    
    def delete_session(self, session_token):
        """Menghapus session (logout)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM sessions WHERE session_token = ?', (session_token,))
        conn.commit()
        conn.close()
    
    # ==================== LOGIN HISTORY ====================
    
    def add_login_history(self, user_id, login_type, ip=None, user_agent=None):
        """Mencatat history login"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO login_history (user_id, login_type, ip_address, user_agent)
            VALUES (?, ?, ?, ?)
        ''', (user_id, login_type, ip, user_agent))
        
        conn.commit()
        conn.close()
    
    def get_login_history(self, user_id, limit=10):
        """Mendapatkan history login user"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM login_history 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        ''', (user_id, limit))
        
        history = cursor.fetchall()
        conn.close()
        
        return [dict(h) for h in history]
    
    # ==================== UTILITY ====================
    
    def get_all_users(self):
        """Mendapatkan semua user (untuk admin)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users ORDER BY created_at DESC')
        users = cursor.fetchall()
        
        conn.close()
        return [dict(u) for u in users]
    
    def delete_user(self, user_id):
        """Menghapus user (soft delete dengan is_active = 0)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('UPDATE users SET is_active = 0 WHERE id = ?', (user_id,))
        conn.commit()
        conn.close()
        
        return True

# Buat instance database global
db = Database()

if __name__ == '__main__':
    # Test koneksi database
    print("Testing database connection...")
    test_db = Database()
    print("✅ Database ready")
