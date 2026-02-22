import sqlite3
from datetime import datetime

class Database:
    def __init__(self, db_name='indotag.db'):
        self.db_name = db_name
        self.init_db()
    
    def get_connection(self):
        return sqlite3.connect(self.db_name)
    
    def init_db(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER UNIQUE,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                photo_url TEXT,
                language_code TEXT,
                is_bot BOOLEAN DEFAULT 0,
                is_premium BOOLEAN DEFAULT 0,
                added_to_attachment_menu BOOLEAN DEFAULT 0,
                allows_write_to_pm BOOLEAN DEFAULT 1,
                is_admin INTEGER DEFAULT 0,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabel sessions untuk menyimpan state user di bot
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                chat_id INTEGER,
                state TEXT,
                data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (telegram_id),
                UNIQUE(user_id, chat_id)
            )
        ''')
        
        conn.commit()
        conn.close()
        print("Database initialized successfully!")
    
    # ============= USER METHODS =============
    
    def save_user(self, telegram_user):
        """
        Menyimpan atau mengupdate data user Telegram
        telegram_user: dict dari Telegram API
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Extract data dari telegram_user
        user_data = {
            'telegram_id': telegram_user.get('id'),
            'username': telegram_user.get('username', ''),
            'first_name': telegram_user.get('first_name', ''),
            'last_name': telegram_user.get('last_name', ''),
            'photo_url': telegram_user.get('photo_url', ''),
            'language_code': telegram_user.get('language_code', ''),
            'is_bot': telegram_user.get('is_bot', False),
            'is_premium': telegram_user.get('is_premium', False),
            'added_to_attachment_menu': telegram_user.get('added_to_attachment_menu', False),
            'allows_write_to_pm': telegram_user.get('allows_write_to_pm', True)
        }
        
        cursor.execute('''
            INSERT OR REPLACE INTO users 
            (telegram_id, username, first_name, last_name, photo_url, 
             language_code, is_bot, is_premium, added_to_attachment_menu, 
             allows_write_to_pm, last_login, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ''', (
            user_data['telegram_id'],
            user_data['username'],
            user_data['first_name'],
            user_data['last_name'],
            user_data['photo_url'],
            user_data['language_code'],
            user_data['is_bot'],
            user_data['is_premium'],
            user_data['added_to_attachment_menu'],
            user_data['allows_write_to_pm']
        ))
        
        conn.commit()
        
        # Ambil user_id yang baru saja di-insert
        cursor.execute('SELECT id FROM users WHERE telegram_id = ?', (user_data['telegram_id'],))
        user_db_id = cursor.fetchone()[0]
        
        conn.close()
        return user_db_id
    
    def get_user(self, telegram_id):
        """Mendapatkan data user berdasarkan telegram_id"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE telegram_id = ?', (telegram_id,))
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return {
                'id': user[0],
                'telegram_id': user[1],
                'username': user[2],
                'first_name': user[3],
                'last_name': user[4],
                'photo_url': user[5],
                'language_code': user[6],
                'is_bot': user[7],
                'is_premium': user[8],
                'added_to_attachment_menu': user[9],
                'allows_write_to_pm': user[10],
                'is_admin': user[11],
                'last_login': user[12],
                'created_at': user[13],
                'updated_at': user[14]
            }
        return None
    
    def get_user_by_db_id(self, user_id):
        """Mendapatkan data user berdasarkan ID database"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return {
                'id': user[0],
                'telegram_id': user[1],
                'username': user[2],
                'first_name': user[3],
                'last_name': user[4],
                'photo_url': user[5],
                'language_code': user[6],
                'is_bot': user[7],
                'is_premium': user[8],
                'added_to_attachment_menu': user[9],
                'allows_write_to_pm': user[10],
                'is_admin': user[11],
                'last_login': user[12],
                'created_at': user[13],
                'updated_at': user[14]
            }
        return None
    
    def update_last_login(self, telegram_id):
        """Update last login user"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE users 
            SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
            WHERE telegram_id = ?
        ''', (telegram_id,))
        conn.commit()
        conn.close()
    
    def get_all_users(self):
        """Mendapatkan semua user (untuk admin)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users ORDER BY created_at DESC')
        users = cursor.fetchall()
        conn.close()
        
        result = []
        for user in users:
            result.append({
                'id': user[0],
                'telegram_id': user[1],
                'username': user[2],
                'first_name': user[3],
                'last_name': user[4],
                'is_admin': user[11],
                'created_at': user[13],
                'last_login': user[12]
            })
        return result
    
    def set_admin(self, telegram_id, is_admin=True):
        """Set user sebagai admin"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE users SET is_admin = ? WHERE telegram_id = ?', (1 if is_admin else 0, telegram_id))
        conn.commit()
        conn.close()
    
    def is_admin(self, telegram_id):
        """Cek apakah user adalah admin"""
        user = self.get_user(telegram_id)
        return user and user['is_admin'] == 1
    
    def get_user_count(self):
        """Mendapatkan jumlah total user"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM users')
        count = cursor.fetchone()[0]
        conn.close()
        return count
    
    # ============= SESSION METHODS =============
    
    def save_session(self, user_id, chat_id, state, data=None):
        """Menyimpan session user untuk bot"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        import json
        data_json = json.dumps(data) if data else '{}'
        
        cursor.execute('''
            INSERT OR REPLACE INTO user_sessions (user_id, chat_id, state, data, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ''', (user_id, chat_id, state, data_json))
        
        conn.commit()
        conn.close()
    
    def get_session(self, user_id, chat_id):
        """Mendapatkan session user"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM user_sessions WHERE user_id = ? AND chat_id = ?', (user_id, chat_id))
        session = cursor.fetchone()
        conn.close()
        
        if session:
            import json
            return {
                'id': session[0],
                'user_id': session[1],
                'chat_id': session[2],
                'state': session[3],
                'data': json.loads(session[4]) if session[4] else {},
                'created_at': session[5],
                'updated_at': session[6]
            }
        return None
    
    def clear_session(self, user_id, chat_id):
        """Menghapus session user"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM user_sessions WHERE user_id = ? AND chat_id = ?', (user_id, chat_id))
        conn.commit()
        conn.close()
    
    def update_session_data(self, user_id, chat_id, data):
        """Update data session"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        import json
        data_json = json.dumps(data)
        
        cursor.execute('''
            UPDATE user_sessions 
            SET data = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE user_id = ? AND chat_id = ?
        ''', (data_json, user_id, chat_id))
        
        conn.commit()
        conn.close()

# Singleton instance
db = Database()
