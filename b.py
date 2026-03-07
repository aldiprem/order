from telethon import TelegramClient, events, Button, types, functions
from telethon.tl.types import Channel, User, ChannelParticipantsAdmins
import asyncio
import threading
import traceback
import logging
import os
import time
from dotenv import load_dotenv
from database.data import Database

# Load environment variables
load_dotenv()

# Konfigurasi
API_ID = int(os.getenv('TELEGRAM_API_ID', ''))
API_HASH = os.getenv('TELEGRAM_API_HASH', '')
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')

# Inisialisasi
db = Database()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
bot = None
bot_loop = None
bot_thread = None
bot_ready = False
request_queue = []
request_results = {}
request_counter = 0
queue_lock = threading.Lock()

# ==================== BOT CLIENT ====================

async def init_bot():
    """Initialize bot client"""
    global bot, bot_ready
    
    try:
        # Create new client
        bot = TelegramClient("indotag_session", API_ID, API_HASH)
        
        # Start bot
        await bot.start(bot_token=BOT_TOKEN)
        logger.info("✅ Bot started successfully")
        
        # Set bot ready
        bot_ready = True
        
        # Setup handlers
        await setup_handlers()
        
        return bot
    except Exception as e:
        logger.error(f"❌ Error initializing bot: {e}")
        bot_ready = False
        raise e

async def setup_handlers():
    """Setup bot handlers"""
    
    @bot.on(events.NewMessage(pattern="^/start$"))
    async def handle_start(event):
        try:
            user = await event.get_sender()
            user_id = user.id
            first_name = user.first_name or ""
            last_name = user.last_name or ""
            username = user.username
            fullname = f"{first_name} {last_name}".strip()
            mention = f"[{fullname}](tg://user?id={user_id})"
            if not fullname:
                fullbame = "NO NAME"
            
            logger.info(f"✅ User {fullname} ({username}) start bot.")
            
            db.add_user(
                user_id=user_id,
                username=username,
                fullname=fullname
            )
            
            msg = f"""
👋 Hallo... {mention} (@{username})

__Selamat datang di INDOTAG MARKET, Buka miniapp dan lakukan perdagangan yang nyata!__
            """
            
            buttons = [
              [Button.url("📱 OPEN MINIAPP", "https://t.me/indotagbot/market")]
            ]
            
            await event.respond(mesg, buttons=buttons)
            
            db.add_activity_log(
                user_id, "BOT_START", f"@{username} Start bot!"
            )
            
        except Exception as e:
            logger.error(f"❌ Handle start error: {e}")
            traceback.print_exc()
            try:
                await event.respond(f"❌ Terjadi kesalahan, segera hubungi admin!\n{e}")
            except:
                pass
    
    @bot.on(events.CallbackQuery(pattern=b"verify_"))
    async def verify_callback(event):
        """Handle verification button press"""
        try:
            data = event.data.decode()
            verification_id = data.replace("verify_", "")
            
            logger.info(f"Verification callback received for ID: {verification_id}")
            
            session = db.get_verification_session(verification_id)
            if not session:
                await event.answer("❌ Sesi tidak valid atau sudah kadaluarsa!", alert=True)
                return
            
            username = session[2]
            session_type = session[3]
            requester_id = session[4]
            session_owner_id = session[5]
            user_id = event.sender_id
            
            if session_owner_id and user_id != session_owner_id:
                await event.answer("❌ Anda bukan owner dari username ini!", alert=True)
                return
            
            db.update_verification_session(verification_id, status="verified", owner_id=user_id)
            
            try:
                user_entity = await bot.get_entity(user_id)
                user_username = user_entity.username if user_entity else None
            except:
                user_username = None
            
            success = db.add_username_request(username, session_type, user_id, user_username, requester_id)
            
            if success:
                await event.edit(f"✅ **Verifikasi Berhasil!**\nUsername @{username} telah diverifikasi dan ditambahkan ke database.")
                await event.answer("✅ Verifikasi berhasil!", alert=True)
                db.add_activity_log(requester_id, "VERIFY_SUCCESS", f"Username @{username} berhasil diverifikasi")
            else:
                await event.answer("❌ Gagal menambahkan ke database!", alert=True)
                
        except Exception as e:
            logger.error(f"Error in verify_callback: {e}")
            traceback.print_exc()
            await event.answer("❌ Terjadi kesalahan!", alert=True)

# ==================== FUNGSI BOT CORE ====================

async def get_entity_info(username):
    """Get entity info from username"""
    try:
        if not bot_ready or not bot:
            return {'success': False, 'error': 'Bot tidak siap', 'needs_retry': True}
        
        if not username.startswith('@'):
            username_with_at = '@' + username
        else:
            username_with_at = username
            username = username[1:]
        
        logger.info(f"🔍 Getting entity for: {username_with_at}")
        
        try:
            entity = await bot.get_entity(username_with_at)
            logger.info(f"✅ Entity found: {type(entity).__name__} - ID: {entity.id}")
            
            return {
                'success': True,
                'id': entity.id,
                'username': username,
                'type': 'channel' if isinstance(entity, Channel) else 'user' if isinstance(entity, User) else 'unknown'
            }
        except Exception as e:
            error_str = str(e)
            logger.error(f"❌ Telethon error for {username_with_at}: {error_str}")
            
            if "Cannot find any entity" in error_str or "username not found" in error_str.lower():
                return {'success': False, 'error': f'Username @{username} tidak ditemukan di Telegram'}
            elif "FLOOD_WAIT" in error_str:
                return {'success': False, 'error': 'Terlalu banyak permintaan. Silakan coba lagi nanti.'}
            else:
                return {'success': False, 'error': f'Kesalahan Telegram: {error_str}'}
            
    except Exception as e:
        logger.error(f"Error in get_entity_info for {username}: {str(e)}")
        return {'success': False, 'error': str(e)}

async def get_channel_creator(channel):
    """Get channel creator info"""
    try:
        if not bot_ready or not bot:
            return None, None
            
        creator_id = None
        creator_username = None
        
        admins = await bot.get_participants(channel, filter=types.ChannelParticipantsAdmins)
        
        for admin in admins:
            try:
                participant = await bot(functions.channels.GetParticipantRequest(
                    channel=channel,
                    participant=admin.id
                ))
                if hasattr(participant, 'participant') and isinstance(participant.participant, types.ChannelParticipantCreator):
                    creator_id = admin.id
                    creator_username = admin.username
                    break
            except:
                if hasattr(admin, 'admin_rights') and admin.admin_rights and admin.admin_rights.is_creator:
                    creator_id = admin.id
                    creator_username = admin.username
                    break
                elif hasattr(admin, 'participant') and hasattr(admin.participant, 'is_creator') and admin.participant.is_creator:
                    creator_id = admin.id
                    creator_username = admin.username
                    break
        
        return creator_id, creator_username
    except Exception as e:
        logger.error(f"Error getting channel creator: {e}")
        return None, None

async def send_otp_to_user(user_id, username, otp_code, requester_id):
    """Send OTP to user"""
    try:
        if not bot_ready or not bot:
            return {'success': False, 'error': 'Bot tidak siap', 'needs_retry': True}
            
        otp_msg = f"""
🔐 **Kode Verifikasi**

Seseorang ingin menambahkan username Anda (@{username}) ke database INDOTAG MARKET.

Kode verifikasi Anda: `{otp_code}`

Jangan bagikan kode ini kepada siapapun.
        """
        await bot.send_message(int(user_id), otp_msg)
        
        await bot.send_message(
            int(requester_id),
            f"✅ **Kode OTP telah dikirim ke @{username}**\n\nSilakan minta kode tersebut dan masukkan di website."
        )
        return {'success': True}
    except Exception as e:
        logger.error(f"Error sending OTP: {e}")
        return {'success': False, 'error': str(e)}

async def send_channel_verification(channel_username, requester_id, requester_name, verification_id, is_admin_verification=False):
    """Send verification message to channel"""
    try:
        if not bot_ready or not bot:
            return {'success': False, 'error': 'Bot tidak siap', 'needs_retry': True}
            
        if not channel_username.startswith('@'):
            channel_with_at = '@' + channel_username
        else:
            channel_with_at = channel_username
        
        if is_admin_verification:
            button_text = "✅ Verifikasi Channel (Sebagai Admin)"
            verification_msg = f"""
🔔 **Verifikasi Channel Diperlukan**

Channel: @{channel_username}
Pengirim: {requester_name} (ID: {requester_id})

Klik tombol di bawah untuk **memverifikasi sebagai admin channel**. 
*Catatan: Sistem akan menganggap admin yang menekan tombol ini sebagai pemilik untuk keperluan pencatatan.*
            """
        else:
            button_text = "✅ Verifikasi Channel"
            verification_msg = f"""
🔔 **Verifikasi Channel Diperlukan**

Channel: @{channel_username}
Pengirim: {requester_name} (ID: {requester_id})

Klik tombol di bawah untuk memverifikasi bahwa Anda adalah owner channel ini.
            """
        
        buttons = [[Button.inline(button_text, data=f"verify_{verification_id}".encode())]]
        await bot.send_message(channel_with_at, verification_msg, buttons=buttons)
        return {'success': True}
    except Exception as e:
        logger.error(f"Error sending channel verification: {e}")
        return {'success': False, 'error': str(e)}

async def notify_requester(requester_id, message, is_success=True):
    """Send notification to requester"""
    try:
        if not bot_ready or not bot:
            return {'success': False, 'error': 'Bot tidak siap', 'needs_retry': True}
            
        emoji = "✅" if is_success else "❌"
        full_message = f"{emoji} **Notifikasi**\n\n{message}"
        await bot.send_message(int(requester_id), full_message)
        return {'success': True}
    except Exception as e:
        logger.error(f"Error notifying requester: {e}")
        return {'success': False, 'error': str(e)}

# ==================== QUEUE SYSTEM ====================

async def process_request_in_queue(request_id, request_type, params):
    """Process a request in the bot's event loop"""
    try:
        if request_type == 'get_entity':
            result = await get_entity_info(params.get('username', ''))
        elif request_type == 'get_channel_creator':
            username = params.get('username')
            entity_result = await get_entity_info(username)
            if not entity_result.get('success'):
                result = entity_result
            else:
                try:
                    if not username.startswith('@'):
                        username_with_at = '@' + username
                    else:
                        username_with_at = username
                    entity = await bot.get_entity(username_with_at)
                    
                    if not isinstance(entity, Channel):
                        result = {'success': False, 'error': 'Bukan channel'}
                    else:
                        creator_id, creator_username = await get_channel_creator(entity)
                        result = {
                            'success': True,
                            'creator_id': creator_id,
                            'creator_username': creator_username,
                            'channel_id': entity.id
                        }
                except Exception as e:
                    result = {'success': False, 'error': str(e)}
        elif request_type == 'send_otp':
            result = await send_otp_to_user(
                params.get('user_id'),
                params.get('username'),
                params.get('otp_code'),
                params.get('requester_id')
            )
        elif request_type == 'send_channel_verification':
            result = await send_channel_verification(
                params.get('channel_username'),
                params.get('requester_id'),
                params.get('requester_name'),
                params.get('verification_id'),
                params.get('is_admin_verification', False)
            )
        elif request_type == 'notify_requester':
            result = await notify_requester(
                params.get('requester_id'),
                params.get('message'),
                params.get('is_success', True)
            )
        else:
            result = {'success': False, 'error': 'Unknown request type'}
        
        # Store result
        with queue_lock:
            request_results[request_id] = result
            
    except Exception as e:
        logger.error(f"Error processing request {request_id}: {e}")
        with queue_lock:
            request_results[request_id] = {'success': False, 'error': str(e)}

async def queue_processor():
    """Process queued requests"""
    global request_queue
    
    logger.info("🚀 Queue processor started")
    
    while True:
        try:
            # Wait for bot to be ready
            if not bot_ready:
                await asyncio.sleep(0.5)
                continue
            
            # Get next request
            request_item = None
            with queue_lock:
                if request_queue:
                    request_item = request_queue.pop(0)
            
            if request_item:
                request_id = request_item['id']
                request_type = request_item['type']
                params = request_item['params']
                
                logger.info(f"📦 Processing queued request: {request_id} - {request_type}")
                await process_request_in_queue(request_id, request_type, params)
            else:
                await asyncio.sleep(0.1)
                
        except Exception as e:
            logger.error(f"Error in queue processor: {e}")
            await asyncio.sleep(1)

async def start_bot():
    """Start the bot and queue processor"""
    global bot, bot_ready, bot_loop
    
    try:
        bot_loop = asyncio.get_running_loop()
        
        # Initialize bot
        await init_bot()
        
        # Start queue processor
        asyncio.create_task(queue_processor())
        
        # Run until disconnected
        await bot.run_until_disconnected()
        
    except Exception as e:
        logger.error(f"Bot error: {e}")
        bot_ready = False
    finally:
        logger.info("Bot stopped")

def run_bot():
    """Run bot in separate thread"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        loop.run_until_complete(start_bot())
    except Exception as e:
        logger.error(f"Bot thread error: {e}")
    finally:
        loop.close()

# ==================== PUBLIC API ====================

def call_bot_sync(request_type, params):
    """Synchronous wrapper for bot functions using queue system"""
    global request_counter
    
    # Generate unique request ID
    request_counter += 1
    request_id = f"req_{int(time.time())}_{request_counter}"
    
    # Add to queue
    with queue_lock:
        request_queue.append({
            'id': request_id,
            'type': request_type,
            'params': params
        })
    
    # Wait for result
    timeout = 30  # 30 seconds timeout
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        with queue_lock:
            if request_id in request_results:
                result = request_results.pop(request_id)
                return result
        
        # Check if bot is ready
        if not bot_ready:
            time.sleep(0.1)
            continue
            
        time.sleep(0.1)
    
    # Timeout
    logger.error(f"Timeout waiting for request {request_id}")
    return {'success': False, 'error': 'Request timeout'}

def is_bot_ready():
    """Check if bot is ready"""
    return bot_ready

# ==================== EXPORTS ====================

__all__ = ['db', 'call_bot_sync', 'run_bot', 'is_bot_ready']