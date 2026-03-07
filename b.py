from telethon import TelegramClient, events, Button, types, functions
from telethon.tl.types import Channel, User, ChannelParticipantsAdmins
import asyncio
import threading
import traceback
import logging
from database.data import Database

# Konfigurasi
API_ID = 24576633
API_HASH = "29931cf620fad738ee7f69442c98e2ee"
BOT_TOKEN = "8560327887:AAHCjef_6K20ZCzqDHuFkO5UpmWS9STYv7M"

# Inisialisasi bot dan database
bot = TelegramClient("indotag", API_ID, API_HASH)
db = Database()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== FUNGSI BOT CORE ====================

async def get_entity_info(username):
    """Get entity info from username"""
    try:
        if not username.startswith('@'):
            username = '@' + username
        entity = await bot.get_entity(username)
        return entity
    except Exception as e:
        logger.error(f"Error getting entity for {username}: {str(e)}")
        return None

async def get_channel_creator(channel):
    """Get channel creator info"""
    try:
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
        return True
    except Exception as e:
        logger.error(f"Error sending OTP: {e}")
        return False

async def send_channel_verification(channel_username, requester_id, requester_name, verification_id, is_admin_verification=False):
    """Send verification message to channel"""
    try:
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
        return True
    except Exception as e:
        logger.error(f"Error sending channel verification: {e}")
        return False

async def notify_requester(requester_id, message, is_success=True):
    """Send notification to requester"""
    try:
        emoji = "✅" if is_success else "❌"
        full_message = f"{emoji} **Notifikasi**\n\n{message}"
        await bot.send_message(int(requester_id), full_message)
        return True
    except Exception as e:
        logger.error(f"Error notifying requester: {e}")
        return False

# ==================== FUNGSI UNTUK DIPANGGIL DARI FLASK ====================

async def process_bot_request(request_type, params):
    """Process request from Flask"""
    try:
        if request_type == 'get_entity':
            username = params.get('username')
            if username.startswith('@'):
                username = username[1:]
            entity = await get_entity_info(username)
            if entity:
                return {
                    'success': True,
                    'id': entity.id,
                    'username': username,
                    'type': 'channel' if isinstance(entity, Channel) else 'user' if isinstance(entity, User) else 'unknown'
                }
            return {'success': False, 'error': 'Entity not found'}
            
        elif request_type == 'get_channel_creator':
            username = params.get('username')
            entity = await get_entity_info(username)
            if entity and isinstance(entity, Channel):
                creator_id, creator_username = await get_channel_creator(entity)
                return {
                    'success': True,
                    'creator_id': creator_id,
                    'creator_username': creator_username,
                    'channel_id': entity.id
                }
            return {'success': False, 'error': 'Not a channel'}
            
        elif request_type == 'send_otp':
            success = await send_otp_to_user(
                params.get('user_id'),
                params.get('username'),
                params.get('otp_code'),
                params.get('requester_id')
            )
            return {'success': success}
            
        elif request_type == 'send_channel_verification':
            success = await send_channel_verification(
                params.get('channel_username'),
                params.get('requester_id'),
                params.get('requester_name'),
                params.get('verification_id'),
                params.get('is_admin_verification', False)
            )
            return {'success': success}
            
        elif request_type == 'notify_requester':
            success = await notify_requester(
                params.get('requester_id'),
                params.get('message'),
                params.get('is_success', True)
            )
            return {'success': success}
            
        else:
            return {'success': False, 'error': 'Unknown request type'}
            
    except Exception as e:
        logger.error(f"Error processing bot request: {e}")
        return {'success': False, 'error': str(e)}

# ==================== CALLBACK HANDLER ====================

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

# ==================== FUNGSI UNTUK MENJALANKAN BOT ====================

async def start_bot():
    """Start the Telegram bot"""
    await bot.start(bot_token=BOT_TOKEN)
    logger.info("✅ Bot started successfully")
    await bot.run_until_disconnected()

def run_bot():
    """Run bot in event loop"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(start_bot())

# Jangan jalankan Flask di sini, hanya export fungsi-fungsi yang diperlukan
__all__ = ['bot', 'db', 'process_bot_request', 'run_bot']