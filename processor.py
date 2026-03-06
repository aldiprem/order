# bot_processor.py - Menghubungkan web app dengan bot
import asyncio
import threading
from telethon import TelegramClient, events
from database.data import Database

class BotProcessor:
    def __init__(self, bot_client, db):
        self.bot = bot_client
        self.db = db
        self.running = False
        self.loop = None
        
    def start(self):
        """Start the processor in a separate thread"""
        self.running = True
        thread = threading.Thread(target=self._run_loop)
        thread.daemon = True
        thread.start()
        
    def _run_loop(self):
        """Run the asyncio event loop"""
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        self.loop.run_until_complete(self._process_requests())
        
    async def _process_requests(self):
        """Process pending requests from web app"""
        while self.running:
            try:
                # Get pending requests
                pending = self.db.get_pending_webapp_requests(5)
                
                for request in pending:
                    request_id = request[1]  # request_id
                    username = request[2]    # username
                    requester_id = request[3] # requester_id
                    
                    # Proses username seperti di bot
                    await self._process_username_request(username, requester_id, request_id)
                    
                await asyncio.sleep(2)  # Check every 2 seconds
                
            except Exception as e:
                print(f"Error processing requests: {e}")
                await asyncio.sleep(5)
                
    async def _process_username_request(self, username, requester_id, request_id):
        """Process a single username request"""
        try:
            # Get entity info
            if not username.startswith('@'):
                username = '@' + username
                
            entity = await self.bot.get_entity(username)
            
            if not entity:
                self.db.update_webapp_request_status(request_id, 'failed')
                return
            
            # Determine entity type and process accordingly
            from telethon.tl.types import Channel, User
            
            if isinstance(entity, Channel):
                # Process channel - need to send verification message
                await self._process_channel_from_webapp(entity, username, requester_id, request_id)
            elif isinstance(entity, User):
                # Process user - send OTP
                await self._process_user_from_webapp(entity, username, requester_id, request_id)
            else:
                self.db.update_webapp_request_status(request_id, 'failed')
                
        except Exception as e:
            print(f"Error processing username {username}: {e}")
            self.db.update_webapp_request_status(request_id, 'failed')
            
    async def _process_user_from_webapp(self, user_entity, username, requester_id, request_id):
        """Process user username from web app"""
        try:
            clean_username = username[1:] if username.startswith('@') else username
            
            # Check if user exists in database
            user_data = self.db.get_user_by_username(clean_username)
            
            if not user_data:
                # User hasn't started the bot
                await self.bot.send_message(
                    requester_id,
                    f"❌ **User @{clean_username} belum menggunakan bot ini!**\n\nUser tersebut harus memulai bot ini terlebih dahulu dengan mengirim /start"
                )
                self.db.update_webapp_request_status(request_id, 'failed')
                return
            
            # Generate OTP
            otp_code = self.db.generate_otp()
            
            # Generate verification ID
            verification_id = self.db.generate_verification_id()
            
            # Create verification session
            session_id = self.db.create_verification_session(
                verification_id,
                clean_username,
                "user",
                requester_id,
                owner_id=user_entity.id,
                otp_code=otp_code
            )
            
            if not session_id:
                await self.bot.send_message(requester_id, "❌ **Gagal membuat sesi verifikasi!**")
                self.db.update_webapp_request_status(request_id, 'failed')
                return
            
            # Send OTP to target user
            otp_msg = f"""
🔐 **Kode Verifikasi**

Seseorang ingin menambahkan username Anda (@{clean_username}) ke database INDOTAG MARKET melalui Web App.

Kode verifikasi Anda: `{otp_code}`

Jangan bagikan kode ini kepada siapapun.
            """
            await self.bot.send_message(user_entity.id, otp_msg)
            
            # Notify requester
            await self.bot.send_message(
                requester_id,
                f"✅ **Kode OTP telah dikirim ke @{clean_username}**\n\nSilakan minta kode tersebut dan kirimkan ke bot ini.\n\nKetik /cancel untuk membatalkan."
            )
            
            # Update request status
            self.db.update_webapp_request_status(request_id, 'processing')
            
        except Exception as e:
            print(f"Error processing user from webapp: {e}")
            await self.bot.send_message(requester_id, f"❌ **Error: {str(e)}**")
            self.db.update_webapp_request_status(request_id, 'failed')
            
    async def _process_channel_from_webapp(self, channel, username, requester_id, request_id):
        """Process channel username from web app"""
        try:
            clean_username = username[1:] if username.startswith('@') else username
            
            # Try to find creator
            creator_id = None
            creator_username = None
            
            try:
                from telethon.tl.types import ChannelParticipantsAdmins
                admins = await self.bot.get_participants(channel, filter=ChannelParticipantsAdmins)
                
                for admin in admins:
                    if hasattr(admin, 'admin_rights') and admin.admin_rights and admin.admin_rights.is_creator:
                        creator_id = admin.id
                        creator_username = admin.username
                        break
            except Exception as e:
                print(f"Error finding creator: {e}")
            
            # Generate verification ID
            verification_id = self.db.generate_verification_id()
            
            if creator_id:
                # Creator found - create session with owner
                session_id = self.db.create_verification_session(
                    verification_id,
                    clean_username,
                    "channel",
                    requester_id,
                    owner_id=creator_id
                )
                
                # Send verification message to channel
                buttons = [[Button.inline("✅ Verifikasi Channel", data=f"verify_{verification_id}".encode())]]
                verification_msg = f"""
🔔 **Verifikasi Channel Diperlukan**

Channel: @{clean_username}
Pengirim: [User](tg://user?id={requester_id}) (via Web App)

Klik tombol di bawah untuk memverifikasi bahwa Anda adalah owner channel ini.
                """
                await self.bot.send_message(username, verification_msg, buttons=buttons)
                
                await self.bot.send_message(
                    requester_id,
                    f"✅ **Pesan verifikasi telah dikirim ke channel @{clean_username}**\n\nOwner channel harus menekan tombol verifikasi untuk menyelesaikan proses."
                )
            else:
                # Creator not found - send general verification
                session_id = self.db.create_verification_session(
                    verification_id,
                    clean_username,
                    "channel",
                    requester_id,
                    owner_id=None
                )
                
                buttons = [[Button.inline("✅ Verifikasi Channel (Sebagai Admin)", data=f"verify_admin_{verification_id}".encode())]]
                verification_msg = f"""
🔔 **Verifikasi Channel Diperlukan**

Channel: @{clean_username}
Pengirim: [User](tg://user?id={requester_id}) (via Web App)

Klik tombol di bawah untuk **memverifikasi sebagai admin channel**. 
*Catatan: Sistem akan menganggap admin yang menekan tombol ini sebagai pemilik untuk keperluan pencatatan.*
                """
                await self.bot.send_message(username, verification_msg, buttons=buttons)
                
                await self.bot.send_message(
                    requester_id,
                    f"✅ **Pesan verifikasi telah dikirim ke channel @{clean_username}**\n\nSiapa pun admin channel yang menekan tombol verifikasi akan dianggap sebagai pemilik untuk proses ini."
                )
            
            # Update request status
            self.db.update_webapp_request_status(request_id, 'processing')
            
        except Exception as e:
            print(f"Error processing channel from webapp: {e}")
            await self.bot.send_message(requester_id, f"❌ **Error: {str(e)}**")
            self.db.update_webapp_request_status(request_id, 'failed')