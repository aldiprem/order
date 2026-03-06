# processor.py - Menghubungkan web app dengan bot
import asyncio
from telethon import TelegramClient, events, Button
from telethon.tl.types import Channel, User, ChannelParticipantsAdmins
from database.data import Database
import traceback

class BotProcessor:
    def __init__(self, bot_client, db):
        self.bot = bot_client
        self.db = db
        self.running = True  # SET KE TRUE
        self.processed_ids = set()
        # Langsung mulai task di sini
        asyncio.create_task(self._process_requests())
        print("✅ BotProcessor initialized and monitoring for webapp requests...")
        
    async def _process_requests(self):
        """Process pending requests from web app"""
        print("🔄 BotProcessor is now monitoring for webapp requests...")
        while self.running:
            try:
                # Get pending requests
                pending = self.db.get_pending_webapp_requests(5)
                
                if pending:
                    print(f"🔍 Found {len(pending)} pending requests")
                
                for request in pending:
                    request_id = request[1]  # request_id
                    
                    # Skip if already processed
                    if request_id in self.processed_ids:
                        continue
                        
                    username = request[2]    # username
                    requester_id = request[3] # requester_id
                    
                    print(f"📝 Processing webapp request: {request_id} for username @{username}")
                    
                    # Proses username seperti di bot
                    await self._process_username_request(username, requester_id, request_id)
                    
                    # Tandai sebagai sedang diproses
                    self.processed_ids.add(request_id)
                    
                await asyncio.sleep(3)  # Check every 3 seconds
                
            except Exception as e:
                print(f"❌ Error processing requests: {e}")
                traceback.print_exc()
                await asyncio.sleep(5)
    
    async def _process_username_request(self, username, requester_id, request_id):
        """Process a single username request"""
        try:
            # Format username dengan @ jika belum ada
            if not username.startswith('@'):
                username_with_at = '@' + username
            else:
                username_with_at = username
                username = username[1:]  # Clean username tanpa @
                
            print(f"🔍 Getting entity for {username_with_at}...")
            
            try:
                entity = await self.bot.get_entity(username_with_at)
            except Exception as e:
                print(f"❌ Entity not found for {username_with_at}: {e}")
                self.db.update_webapp_request_status(request_id, 'failed')
                await self.bot.send_message(
                    requester_id,
                    f"❌ **Username tidak ditemukan!**\n@{username} tidak dapat ditemukan di Telegram."
                )
                return
            
            print(f"✅ Entity found: {type(entity).__name__} - {getattr(entity, 'id', 'N/A')}")
            
            # Determine entity type and process accordingly
            if isinstance(entity, Channel):
                print(f"📢 Processing channel: @{username}")
                await self._process_channel_from_webapp(entity, username, requester_id, request_id)
            elif isinstance(entity, User):
                print(f"👤 Processing user: @{username}")
                await self._process_user_from_webapp(entity, username, requester_id, request_id)
            else:
                print(f"❌ Unknown entity type for @{username}")
                self.db.update_webapp_request_status(request_id, 'failed')
                await self.bot.send_message(
                    requester_id,
                    f"❌ **Tipe username tidak dikenal!**\n@{username} bukan channel atau user."
                )
                
        except Exception as e:
            print(f"❌ Error processing username {username}: {e}")
            traceback.print_exc()
            self.db.update_webapp_request_status(request_id, 'failed')
            try:
                await self.bot.send_message(
                    requester_id,
                    f"❌ **Error:** {str(e)}\n\nPastikan username benar dan bot memiliki akses."
                )
            except:
                pass
            
    async def _process_user_from_webapp(self, user_entity, username, requester_id, request_id):
        """Process user username from web app"""
        try:
            clean_username = username
            
            print(f"🔍 Checking if user @{clean_username} exists in database...")
            # Check if user exists in database
            user_data = self.db.get_user_by_username(clean_username)
            
            if not user_data:
                print(f"❌ User @{clean_username} not found in database")
                await self.bot.send_message(
                    requester_id,
                    f"❌ **User @{clean_username} belum menggunakan bot ini!**\n\nUser tersebut harus memulai bot ini terlebih dahulu dengan mengirim /start"
                )
                self.db.update_webapp_request_status(request_id, 'failed')
                return
            
            print(f"✅ User @{clean_username} found in database")
            
            # Generate OTP
            otp_code = self.db.generate_otp()
            print(f"🔐 Generated OTP: {otp_code} for @{clean_username}")
            
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
                print(f"❌ Failed to create verification session for @{clean_username}")
                await self.bot.send_message(requester_id, "❌ **Gagal membuat sesi verifikasi!**")
                self.db.update_webapp_request_status(request_id, 'failed')
                return
            
            print(f"✅ Verification session created: {session_id}")
            
            # Send OTP to target user
            otp_msg = f"""
🔐 **Kode Verifikasi**

Seseorang ingin menambahkan username Anda (@{clean_username}) ke database INDOTAG MARKET melalui Web App.

Kode verifikasi Anda: `{otp_code}`

Jangan bagikan kode ini kepada siapapun.
            """
            await self.bot.send_message(user_entity.id, otp_msg)
            print(f"📨 OTP sent to user @{clean_username} ({user_entity.id})")
            
            # Notify requester
            await self.bot.send_message(
                requester_id,
                f"✅ **Kode OTP telah dikirim ke @{clean_username}**\n\nSilakan minta kode tersebut dan kirimkan ke bot ini.\n\nKetik /cancel untuk membatalkan."
            )
            print(f"📨 Notification sent to requester {requester_id}")
            
            # Update request status
            self.db.update_webapp_request_status(request_id, 'processing')
            print(f"✅ Webapp request {request_id} marked as processing")
            
        except Exception as e:
            print(f"❌ Error processing user from webapp: {e}")
            traceback.print_exc()
            try:
                await self.bot.send_message(requester_id, f"❌ **Error: {str(e)}**")
            except:
                pass
            self.db.update_webapp_request_status(request_id, 'failed')
            
    async def _process_channel_from_webapp(self, channel, username, requester_id, request_id):
        """Process channel username from web app"""
        try:
            clean_username = username
            
            print(f"🔍 Looking for creator of channel @{clean_username}...")
            
            # Try to find creator
            creator_id = None
            creator_username = None
            
            try:
                admins = await self.bot.get_participants(channel, filter=ChannelParticipantsAdmins)
                print(f"Found {len(admins)} admins in channel @{clean_username}")
                
                for admin in admins:
                    # Check if admin is creator
                    if hasattr(admin, 'admin_rights') and admin.admin_rights and admin.admin_rights.is_creator:
                        creator_id = admin.id
                        creator_username = admin.username
                        print(f"✅ Creator found: @{creator_username} ({creator_id})")
                        break
                        
                    # Alternative method
                    if hasattr(admin, 'participant') and hasattr(admin.participant, 'is_creator') and admin.participant.is_creator:
                        creator_id = admin.id
                        creator_username = admin.username
                        print(f"✅ Creator found (via participant): @{creator_username} ({creator_id})")
                        break
                        
            except Exception as e:
                print(f"⚠️ Error finding creator: {e}")
            
            # Generate verification ID
            verification_id = self.db.generate_verification_id()
            
            channel_with_at = '@' + clean_username
            
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
                await self.bot.send_message(channel_with_at, verification_msg, buttons=buttons)
                print(f"📨 Verification message sent to channel @{clean_username}")
                
                await self.bot.send_message(
                    requester_id,
                    f"✅ **Pesan verifikasi telah dikirim ke channel @{clean_username}**\n\nOwner channel harus menekan tombol verifikasi untuk menyelesaikan proses."
                )
                print(f"📨 Notification sent to requester {requester_id}")
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
                await self.bot.send_message(channel_with_at, verification_msg, buttons=buttons)
                print(f"📨 Verification message sent to channel @{clean_username} (admin verification)")
                
                await self.bot.send_message(
                    requester_id,
                    f"✅ **Pesan verifikasi telah dikirim ke channel @{clean_username}**\n\nSiapa pun admin channel yang menekan tombol verifikasi akan dianggap sebagai pemilik untuk proses ini."
                )
                print(f"📨 Notification sent to requester {requester_id}")
            
            # Update request status
            self.db.update_webapp_request_status(request_id, 'processing')
            print(f"✅ Webapp request {request_id} marked as processing")
            
        except Exception as e:
            print(f"❌ Error processing channel from webapp: {e}")
            traceback.print_exc()
            try:
                await self.bot.send_message(requester_id, f"❌ **Error: {str(e)}**")
            except:
                pass
            self.db.update_webapp_request_status(request_id, 'failed')