# database/default.py - Lengkap
import sqlite3
import os
import json
from datetime import datetime
from typing import Optional, Dict, List, Any

class Database:
    def __init__(self, db_path: str = None):
        """Initialize database connection"""
        if db_path is None:
            # Get database path from environment or use default
            db_path = os.getenv('DATABASE_PATH', 'database/data.db')
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        self.db_path = db_path
        self.init_db()
    
    def get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Return rows as dictionaries
        return conn
    
    def init_db(self):
        """Initialize database tables"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                first_name TEXT,
                last_name TEXT,
                username TEXT,
                language_code TEXT,
                is_premium BOOLEAN DEFAULT 0,
                photo_url TEXT,
                balance INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create market items table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS market_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                category TEXT,
                image_url TEXT,
                stock INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create games table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                icon TEXT,
                players INTEGER DEFAULT 0,
                category TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create activities table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                type TEXT NOT NULL,
                description TEXT NOT NULL,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Create purchases table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                item_id INTEGER,
                amount REAL,
                status TEXT DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (item_id) REFERENCES market_items (id)
            )
        ''')
        
        # Insert sample data if tables are empty
        self.insert_sample_data(cursor)
        
        conn.commit()
        conn.close()
    
    def insert_sample_data(self, cursor):
        """Insert sample data for testing"""
        # Check if market_items is empty
        cursor.execute('SELECT COUNT(*) FROM market_items')
        if cursor.fetchone()[0] == 0:
            sample_items = [
                ('Premium Token', 'Special premium token', 99.99, 'premium', None, 100),
                ('Basic Token', 'Standard basic token', 19.99, 'basic', None, 1000),
                ('Rare NFT', 'Limited edition NFT', 499.99, 'nft', None, 10),
                ('Game Pass', 'Access to all games', 29.99, 'subscription', None, 500),
                ('Boost Pack', 'Power-up package', 9.99, 'booster', None, 1000)
            ]
            cursor.executemany('''
                INSERT INTO market_items (name, description, price, category, image_url, stock)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', sample_items)
        
        # Check if games is empty
        cursor.execute('SELECT COUNT(*) FROM games')
        if cursor.fetchone()[0] == 0:
            sample_games = [
                ('Crypto Puzzle', 'Solve puzzles to earn tokens', '🧩', 1234, 'puzzle'),
                ('Token Jump', 'Jump and collect tokens', '🎮', 567, 'arcade'),
                ('NFT Racer', 'Race with NFT cars', '🏎️', 890, 'racing'),
                ('Memory Match', 'Match cards to win', '🃏', 345, 'memory')
            ]
            cursor.executemany('''
                INSERT INTO games (name, description, icon, players, category)
                VALUES (?, ?, ?, ?, ?)
            ''', sample_games)
    
    def save_user(self, user_data: Dict[str, Any]) -> int:
        """Save or update user data"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute('SELECT id FROM users WHERE id = ?', (user_data.get('id'),))
        existing = cursor.fetchone()
        
        if existing:
            # Update existing user
            cursor.execute('''
                UPDATE users 
                SET first_name = ?, last_name = ?, username = ?, 
                    language_code = ?, is_premium = ?, last_seen = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (
                user_data.get('first_name'),
                user_data.get('last_name'),
                user_data.get('username'),
                user_data.get('language_code'),
                user_data.get('is_premium', False),
                user_data.get('id')
            ))
        else:
            # Insert new user
            cursor.execute('''
                INSERT INTO users (id, first_name, last_name, username, language_code, is_premium)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                user_data.get('id'),
                user_data.get('first_name'),
                user_data.get('last_name'),
                user_data.get('username'),
                user_data.get('language_code'),
                user_data.get('is_premium', False)
            ))
        
        conn.commit()
        user_id = user_data.get('id')
        conn.close()
        
        return user_id
    
    def get_user(self, user_id: int) -> Optional[Dict]:
        """Get user by ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        conn.close()
        
        return dict(user) if user else None
    
    def get_user_profile(self, user_id: int) -> Dict:
        """Get user profile with additional data"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Get user data
        cursor.execute('''
            SELECT id, first_name, last_name, username, balance, level, created_at
            FROM users WHERE id = ?
        ''', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return {
                'balance': 0,
                'level': 1,
                'joined': 'Unknown',
                'achievements': 0
            }
        
        user_dict = dict(user)
        
        # Get achievement count (purchases + activities)
        cursor.execute('''
            SELECT COUNT(*) FROM purchases WHERE user_id = ?
        ''', (user_id,))
        purchases = cursor.fetchone()[0]
        
        cursor.execute('''
            SELECT COUNT(*) FROM activities WHERE user_id = ?
        ''', (user_id,))
        activities = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'balance': user_dict.get('balance', 0),
            'level': user_dict.get('level', 1),
            'joined': user_dict.get('created_at', 'Unknown'),
            'achievements': purchases + activities
        }
    
    def get_market_items(self, category: str = None) -> List[Dict]:
        """Get market items, optionally filtered by category"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        if category:
            cursor.execute('''
                SELECT * FROM market_items WHERE category = ? ORDER BY created_at DESC
            ''', (category,))
        else:
            cursor.execute('SELECT * FROM market_items ORDER BY created_at DESC')
        
        items = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return items
    
    def get_games(self, category: str = None) -> List[Dict]:
        """Get games, optionally filtered by category"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        if category:
            cursor.execute('''
                SELECT * FROM games WHERE category = ? ORDER BY players DESC
            ''', (category,))
        else:
            cursor.execute('SELECT * FROM games ORDER BY players DESC')
        
        games = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return games
    
    def get_activities(self, user_id: int = None, limit: int = 20) -> List[Dict]:
        """Get activities, optionally filtered by user"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        if user_id:
            cursor.execute('''
                SELECT * FROM activities 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            ''', (user_id, limit))
        else:
            cursor.execute('''
                SELECT * FROM activities 
                ORDER BY created_at DESC 
                LIMIT ?
            ''', (limit,))
        
        activities = []
        for row in cursor.fetchall():
            activity = dict(row)
            # Format time for display
            if activity.get('created_at'):
                try:
                    created = datetime.fromisoformat(activity['created_at'].replace('T', ' '))
                    now = datetime.now()
                    delta = now - created
                    
                    if delta.days > 0:
                        activity['time'] = f"{delta.days} day{'s' if delta.days > 1 else ''} ago"
                    elif delta.seconds > 3600:
                        hours = delta.seconds // 3600
                        activity['time'] = f"{hours} hour{'s' if hours > 1 else ''} ago"
                    elif delta.seconds > 60:
                        minutes = delta.seconds // 60
                        activity['time'] = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
                    else:
                        activity['time'] = "Just now"
                except:
                    activity['time'] = "Recently"
            
            activities.append(activity)
        
        conn.close()
        return activities
    
    def add_activity(self, user_id: int, activity_type: str, description: str, metadata: Dict = None):
        """Add a new activity"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO activities (user_id, type, description, metadata)
            VALUES (?, ?, ?, ?)
        ''', (user_id, activity_type, description, json.dumps(metadata) if metadata else None))
        
        conn.commit()
        conn.close()
    
    def add_purchase(self, user_id: int, item_id: int, amount: float) -> int:
        """Record a purchase"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Insert purchase
        cursor.execute('''
            INSERT INTO purchases (user_id, item_id, amount)
            VALUES (?, ?, ?)
        ''', (user_id, item_id, amount))
        
        purchase_id = cursor.lastrowid
        
        # Update user balance
        cursor.execute('''
            UPDATE users SET balance = balance + ? WHERE id = ?
        ''', (amount, user_id))
        
        # Add activity
        cursor.execute('''
            INSERT INTO activities (user_id, type, description)
            VALUES (?, ?, ?)
        ''', (user_id, 'purchase', f'Purchased item #{item_id}'))
        
        conn.commit()
        conn.close()
        
        return purchase_id
    
    def get_user_balance(self, user_id: int) -> int:
        """Get user balance"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT balance FROM users WHERE id = ?', (user_id,))
        result = cursor.fetchone()
        
        conn.close()
        
        return result[0] if result else 0
    
    def update_user_balance(self, user_id: int, amount: int) -> bool:
        """Update user balance (add or subtract)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                UPDATE users SET balance = balance + ? WHERE id = ?
            ''', (amount, user_id))
            conn.commit()
            success = True
        except Exception as e:
            print(f"Error updating balance: {e}")
            success = False
        finally:
            conn.close()
        
        return success
