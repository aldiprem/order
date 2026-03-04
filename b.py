# b.py - Telegram Bot using Telethon
import os
import asyncio
import logging
from datetime import datetime
from telethon import TelegramClient, events, Button
from telethon.tl.types import PeerUser, PeerChat, PeerChannel
from dotenv import load_dotenv
import sys
import json

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.default import Database

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Bot configuration
API_ID = int(os.getenv('TELEGRAM_API_ID', '0'))
API_HASH = os.getenv('TELEGRAM_API_HASH', '')
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TUNNEL_URL = os.getenv('TUNNEL_URL', '')

# Initialize database
db = Database()

# Initialize Telegram client
bot = TelegramClient('bot', API_ID, API_HASH).start(bot_token=BOT_TOKEN)

@bot.on(events.NewMessage(pattern='/start'))
async def start_handler(event):
    """Handle /start command"""
    user = await event.get_sender()
    
    # Save user to database
    user_data = {
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'username': user.username,
        'language_code': user.lang_code
    }
    db.save_user(user_data)
    
    # Create inline keyboard
    keyboard = [
        [Button.url('🚀 Open Mini App', f"{TUNNEL_URL}")],
        [Button.inline('👤 My Profile', b'profile'),
         Button.inline('💰 Balance', b'balance')],
        [Button.inline('📊 Stats', b'stats'),
         Button.inline('❓ Help', b'help')]
    ]
    
    welcome_text = (
        f"👋 Welcome {user.first_name}!\n\n"
        f"Welcome to our MiniApp Bot. You can access the MiniApp directly from Telegram.\n\n"
        f"**Features:**\n"
        f"• 🎮 Play games\n"
        f"• 💰 Earn tokens\n"
        f"• 🛍️ Shop items\n"
        f"• 📈 Track activity\n\n"
        f"Click the button below to open the MiniApp!"
    )
    
    await event.respond(welcome_text, buttons=keyboard, parse_mode='md')

@bot.on(events.CallbackQuery)
async def callback_handler(event):
    """Handle inline button callbacks"""
    data = event.data.decode('utf-8')
    user = await event.get_sender()
    
    if data == 'profile':
        # Get user profile
        profile = db.get_user_profile(user.id)
        user_data = db.get_user(user.id) or {}
        
        profile_text = (
            f"👤 **Your Profile**\n\n"
            f"**Name:** {user.first_name} {user.last_name or ''}\n"
            f"**Username:** @{user.username or 'None'}\n"
            f"**Level:** {profile.get('level', 1)}\n"
            f"**Balance:** {profile.get('balance', 0)} tokens\n"
            f"**Achievements:** {profile.get('achievements', 0)}\n"
            f"**Joined:** {profile.get('joined', 'Recently')}"
        )
        
        await event.answer()
        await event.edit(profile_text, parse_mode='md')
        
    elif data == 'balance':
        balance = db.get_user_balance(user.id)
        balance_text = (
            f"💰 **Your Balance**\n\n"
            f"You have **{balance}** tokens\n\n"
            f"Earn more tokens by playing games and completing activities!"
        )
        
        keyboard = [[Button.url('🎮 Play Games', f"{TUNNEL_URL}#games")]]
        
        await event.answer()
        await event.edit(balance_text, buttons=keyboard, parse_mode='md')
        
    elif data == 'stats':
        # Get user activities
        activities = db.get_activities(user.id, limit=5)
        
        if activities:
            activity_text = "**Recent Activities:**\n\n"
            for act in activities:
                activity_text += f"• {act.get('description')} ({act.get('time')})\n"
        else:
            activity_text = "No recent activities."
        
        games = db.get_games()
        games_count = len(games)
        
        items = db.get_market_items()
        items_count = len(items)
        
        stats_text = (
            f"📊 **Statistics**\n\n"
            f"**Games Available:** {games_count}\n"
            f"**Market Items:** {items_count}\n\n"
            f"{activity_text}"
        )
        
        await event.answer()
        await event.edit(stats_text, parse_mode='md')
        
    elif data == 'help':
        help_text = (
            "❓ **Help**\n\n"
            "**Commands:**\n"
            "• /start - Start the bot\n"
            "• /profile - View your profile\n"
            "• /balance - Check balance\n"
            "• /activity - View activities\n\n"
            "**Mini App Features:**\n"
            "• **Market:** Buy and sell items\n"
            "• **Games:** Play and earn tokens\n"
            "• **Activity:** Track your history\n"
            "• **Profile:** Manage your account\n\n"
            "Need more help? Contact @support"
        )
        
        await event.answer()
        await event.edit(help_text, parse_mode='md')

@bot.on(events.NewMessage(pattern='/profile'))
async def profile_command(event):
    """Handle /profile command"""
    user = await event.get_sender()
    profile = db.get_user_profile(user.id)
    
    profile_text = (
        f"👤 **Your Profile**\n\n"
        f"**Name:** {user.first_name} {user.last_name or ''}\n"
        f"**Username:** @{user.username or 'None'}\n"
        f"**Level:** {profile.get('level', 1)}\n"
        f"**Balance:** {profile.get('balance', 0)} tokens\n"
        f"**Achievements:** {profile.get('achievements', 0)}"
    )
    
    await event.respond(profile_text, parse_mode='md')

@bot.on(events.NewMessage(pattern='/balance'))
async def balance_command(event):
    """Handle /balance command"""
    user = await event.get_sender()
    balance = db.get_user_balance(user.id)
    
    await event.respond(
        f"💰 Your current balance is **{balance}** tokens.",
        parse_mode='md'
    )

@bot.on(events.NewMessage(pattern='/activity'))
async def activity_command(event):
    """Handle /activity command"""
    user = await event.get_sender()
    activities = db.get_activities(user.id, limit=10)
    
    if not activities:
        await event.respond("No activities found.")
        return
    
    activity_text = "**Your Recent Activities:**\n\n"
    for act in activities:
        activity_text += f"• {act.get('description')} ({act.get('time')})\n"
    
    await event.respond(activity_text, parse_mode='md')

@bot.on(events.NewMessage)
async def message_handler(event):
    """Handle regular messages"""
    message_text = event.raw_text.lower()
    
    if message_text in ['hi', 'hello', 'hey']:
        await event.respond(f"Hello {event.sender.first_name}! 👋")
    elif message_text in ['thanks', 'thank you']:
        await event.respond("You're welcome! 😊")
    elif message_text == 'menu':
        # Send main menu
        keyboard = [
            [Button.url('🚀 Open Mini App', f"{TUNNEL_URL}")],
            [Button.inline('👤 Profile', b'profile'),
             Button.inline('💰 Balance', b'balance')]
        ]
        await event.respond("Main Menu:", buttons=keyboard)

async def send_notification(user_id: int, message: str):
    """Send notification to specific user"""
    try:
        await bot.send_message(user_id, message)
        return True
    except Exception as e:
        logger.error(f"Error sending notification to {user_id}: {e}")
        return False

async def broadcast_message(message: str, user_ids: list):
    """Broadcast message to multiple users"""
    success_count = 0
    fail_count = 0
    
    for user_id in user_ids:
        if await send_notification(user_id, message):
            success_count += 1
        else:
            fail_count += 1
        await asyncio.sleep(0.05)  # Rate limiting
    
    return success_count, fail_count

async def main():
    """Main function to run the bot"""
    logger.info("Bot is starting...")
    
    # Set bot commands
    await bot.send_message('botfather', '/setcommands')
    await asyncio.sleep(1)
    await bot.send_message('botfather', f'@{BOT_TOKEN.split(":")[0]}')
    await asyncio.sleep(1)
    commands = """
start - Start the bot
profile - View your profile
balance - Check your balance
activity - View your activities
help - Get help
    """
    await bot.send_message('botfather', commands)
    
    logger.info("Bot is running!")
    await bot.run_until_disconnected()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Bot crashed: {e}")
