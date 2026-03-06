from telethon import TelegramClient, events, Button, types, functions
from telethon.tl.types import Channel, User, ChannelParticipantsAdmins, ChatAdminRights
import requests
import json
import sqlite3
import asyncio
import traceback
import datetime
import random
import string
import os
import pytz
from database.data import Database
from processor import BotProcessor

API_ID = 24576633
API_HASH = "29931cf620fad738ee7f69442c98e2ee"
BOT_TOKEN = "8560327887:AAHCjef_6K20ZCzqDHuFkO5UpmWS9STYv7M"

bot = TelegramClient("indotag", API_ID, API_HASH).start(bot_token=BOT_TOKEN)

# Initialize database
db = Database()

# User states for input handling
user_state = {}
JAKARTA_TZ = pytz.timezone('Asia/Jakarta')

print("🚀 Starting BotProcessor for web app integration...")
bot_processor = BotProcessor(bot, db)

def format_jakarta_time(dt):
    if dt is None:
        return "Tidak diketahui"
    
    # If dt is string, convert to datetime first
    if isinstance(dt, str):
        try:
            # Parse string to datetime
            if '.' in dt:
                dt = datetime.datetime.strptime(dt.split('.')[0], '%Y-%m-%d %H:%M:%S')
            else:
                dt = datetime.datetime.strptime(dt, '%Y-%m-%d %H:%M:%S')
        except:
            return str(dt)
    
    # Ensure dt is timezone-naive and assume it's in Jakarta time
    if dt.tzinfo is not None:
        dt = dt.astimezone(JAKARTA_TZ).replace(tzinfo=None)
    
    # Format with WIB indicator
    return dt.strftime('%d/%m/%Y %H:%M:%S') + " WIB"

async def get_entity_info(username):
    """Get entity info from username"""
    try:
        # Clean username
        if not username.startswith('@'):
            username = '@' + username
        
        entity = await bot.get_entity(username)
        return entity
    except Exception as e:
        print(f"Error getting entity for {username}: {str(e)}")
        return None

def get_effective_user_id(user_id):
    """Get effective user ID (for future use)"""
    return user_id

async def show_username_detail(event, username):
    try:
        usn_detail = db.get_username_detail(username)
        
        if not usn_detail:
            if hasattr(event, 'answer'):
                await event.answer("❌ Data username tidak ditemukan!", alert=True)
            else:
                await event.respond("❌ Data username tidak ditemukan!")
            return
        
        # Debug: tampilkan semua data dengan index yang jelas
        print(f"\n=== DETAIL UNTUK {username} ===")
        for i, val in enumerate(usn_detail):
            print(f"  index {i}: {val}")
        
        usn_username = usn_detail[1]
        usn_type = usn_detail[2]
        usn_owner_id = usn_detail[3]
        usn_owner_username = usn_detail[4]
        usn_verified_at = usn_detail[6]
        usn_based_on = usn_detail[9]
        usn_listed_status = usn_detail[10]
        usn_price = usn_detail[11] if usn_detail[11] is not None else 0
        usn_shape = usn_detail[12] if len(usn_detail) > 12 else "OP"
        usn_kind = usn_detail[13] if len(usn_detail) > 13 else "MULCHAR INDO"  # JENIS USERNAME
        
        print(f"\nPARSED DATA:")
        print(f"  Username: {usn_username}")
        print(f"  Username Type: {usn_shape}")
        print(f"  Username Kind: {usn_kind}")  # TAMPILKAN KIND
        print(f"  Listed Status from DB: '{usn_listed_status}'")
        print(f"  Price: {usn_price}")
        
        # Konversi price ke integer
        try:
            usn_price = int(usn_price)
        except (ValueError, TypeError):
            usn_price = 0
        
        # Get owner info
        owner_mention = f"@{usn_owner_username}" if usn_owner_username else f"[User](tg://user?id={usn_owner_id})"
        
        # Format waktu
        verified_str = format_jakarta_time(usn_verified_at)
        
        # Format listed status dan button text
        if usn_listed_status == 'listed':
            listed_emoji = "🟢 Listed"
            listed_button_text = "🚫 UNLISTED SELL"
            print(f"Status LISTED → Tombol: {listed_button_text}")
        else:
            listed_emoji = "🔴 Unlisted"
            listed_button_text = "🛒 LISTED SELL"
            print(f"Status UNLISTED → Tombol: {listed_button_text}")
        
        # Format price
        if usn_price and usn_price > 0:
            price_str = f"Rp {usn_price:,}"
        else:
            price_str = "Belum di set"
        
        # Tampilkan kind dengan emoji yang sesuai
        kind_emoji = {
            "MULCHAR INDO": "🇮🇩",
            "MULCHAR ENG": "🇬🇧",
            "IDOL MALE": "👨",
            "IDOL FEMALE": "👩",
            "NSFW": "🔞",
            "2D": "🎮",
            "ANIME": "🌸",
            "ANOTHER": "❓"
        }.get(usn_kind, "❓")
        
        detail_msg = f"""
📌 **Detail Username**

**Username:** @{usn_username}
**Bentuk:** {usn_shape}
**Jenis:** {kind_emoji} {usn_kind}
**Type USN:** {'📢 Channel' if usn_type == 'channel' else '👤 User'}
**Based On:** {usn_based_on or 'Belum di set'}
**Owner:** {owner_mention}
**Status Jual:** {listed_emoji}
**Harga:** {price_str}
**Diverifikasi pada:** {verified_str}
        """
        
        # Create buttons
        buttons = [
            [Button.inline("💠 BASSED ON", data=b"set_bo"),
             Button.inline(listed_button_text, data=f"toggle_listed_{usn_username}".encode())],
            [Button.inline("🔬 BENTUK USN", data=b"set_shape"),
             Button.inline("🏷️ JENIS USN", data=f"set_kind_{usn_username}".encode())],  # TOMBOL JENIS
            [Button.inline("🏷 SET PRICE", data=b"set_price"),
             Button.inline("📊 ACTIVITY", data=b"my_activity")],
            [Button.inline("◀️ BACK MENU", data=b"my_usn"),
             Button.inline("🏠 MAIN MENU", data=b"back_to_menu")]
        ]
        
        # Edit atau kirim pesan
        try:
            await event.edit(detail_msg, buttons=buttons)
            print(f"✅ Success editing message for {usn_username}")
        except AttributeError:
            await event.respond(detail_msg, buttons=buttons)
            print(f"✅ Sent new message for {usn_username}")
        except Exception as e:
            if "Content of the message was not modified" not in str(e):
                print(f"Error editing message: {e}")
                try:
                    await event.respond(detail_msg, buttons=buttons)
                except:
                    pass
            
    except Exception as e:
        error_msg = f"Error in show_username_detail: {str(e)}"
        print(error_msg)
        import traceback
        traceback.print_exc()
        try:
            await event.respond("❌ Terjadi kesalahan internal. Silakan coba lagi.")
        except:
            pass

@bot.on(events.NewMessage(pattern="^/start$"))
async def start(event):
    user = await event.get_sender()
    real_user_id = event.sender_id

    if user.username:
        username = user.username
    elif getattr(user, "usernames", None):
        username = user.usernames[0].username
    else:
        username = None

    # Add user to database
    db.add_user(real_user_id, user.first_name or "", username)
    db.update_user_last_start(real_user_id)

    mention = f"[{user.first_name}](tg://user?id={real_user_id})"
    
    msg = f"""
🗣️ **Hallo... {mention}**

__Selamat datang di bot marketplace username INDOTAG MARKET, Silakan klik tombol dibawah ini untuk menggunakan fitur bot!__
    """
    
    buttons = [
      [Button.inline("📝 BANTUAN", b"help")],
      [Button.inline("🏪 MU USERNAME", b"my_usn"),
       Button.inline("➕ ADD USERNAME", b"add_usn")],
      [Button.url("📺 OPEN APP", "https://t.me/ftamous")],
    ]
    
    await event.respond(msg, buttons=buttons)

@bot.on(events.CallbackQuery(pattern=b"set_kind_"))
async def set_kind_callback(event):
    """Handle set kind button - show kind selection"""
    try:
        data = event.data.decode()
        username = data.replace("set_kind_", "")
        
        print(f"🔧 Setting kind for username: {username}")
        
        # Dapatkan kind saat ini dari database
        current_kind = db.get_username_kind(username)
        
        # Daftar pilihan kind
        kind_options = [
            "MULCHAR INDO",
            "MULCHAR ENG", 
            "IDOL MALE",
            "IDOL FEMALE",
            "NSFW",
            "2D",
            "ANIME",
            "ANOTHER"
        ]
        
        # Buat tombol untuk setiap kind (2 per baris)
        buttons = []
        row = []
        
        for i, kind in enumerate(kind_options, 1):
            # Jika ini adalah kind yang sedang aktif, tambahkan emoji 🔆
            if kind == current_kind:
                button_text = f"🔆 {kind}"
            else:
                button_text = kind
            
            button = Button.inline(button_text, data=f"select_kind_{username}|{kind}".encode())
            row.append(button)
            
            if len(row) == 2 or i == len(kind_options):
                buttons.append(row)
                row = []
        
        # Tombol navigasi
        buttons.append([
            Button.inline("🔙 KEMBALI", data=f"usn_{username}".encode()),
            Button.inline("✅ SIMPAN", data=f"save_kind_{username}".encode())
        ])
        
        # Buat pesan
        msg = f"""
📝 **Pilih Jenis Username untuk @{username}**

Saat ini: **{current_kind}**

Pilih salah satu jenis di bawah ini:
        """
        
        try:
            await event.edit(msg, buttons=buttons)
        except AttributeError:
            await event.respond(msg, buttons=buttons)
        
        await event.answer()
        
    except Exception as e:
        print(f"Error in set_kind_callback: {e}")
        await event.answer("❌ Terjadi kesalahan!", alert=True)

@bot.on(events.CallbackQuery(pattern=b"select_kind_"))
async def select_kind_callback(event):
    """Handle kind selection"""
    try:
        data = event.data.decode()
        # Format: select_kind_username|kind
        parts = data.replace("select_kind_", "").split("|")
        username = parts[0]
        selected_kind = parts[1]
        
        print(f"✅ Selected kind: {selected_kind} for @{username}")
        
        # Simpan sementara di user state
        user_id = event.sender_id
        user_state[user_id] = {
            "action": "kind_selected",
            "username": username,
            "selected_kind": selected_kind
        }
        
        # Update tampilan dengan menandai pilihan
        current_kind = selected_kind
        
        kind_options = [
            "MULCHAR INDO",
            "MULCHAR ENG", 
            "IDOL MALE",
            "IDOL FEMALE",
            "NSFW",
            "2D",
            "ANIME",
            "ANOTHER"
        ]
        
        buttons = []
        row = []
        
        for i, kind in enumerate(kind_options, 1):
            # Tandai yang dipilih dengan 🔆
            if kind == selected_kind:
                button_text = f"🔆 {kind}"
            else:
                button_text = kind
            
            button = Button.inline(button_text, data=f"select_kind_{username}|{kind}".encode())
            row.append(button)
            
            if len(row) == 2 or i == len(kind_options):
                buttons.append(row)
                row = []
        
        buttons.append([
            Button.inline("🔙 KEMBALI", data=f"usn_{username}".encode()),
            Button.inline("✅ SIMPAN", data=f"save_kind_{username}".encode())
        ])
        
        msg = f"""
📝 **Pilih Jenis Username untuk @{username}**

Pilihan sementara: **{selected_kind}** 🔆
Klik ✅ SIMPAN untuk menyimpan.
        """
        
        await event.edit(msg, buttons=buttons)
        await event.answer(f"Memilih: {selected_kind}")
        
    except Exception as e:
        print(f"Error in select_kind_callback: {e}")
        await event.answer("❌ Terjadi kesalahan!", alert=True)

@bot.on(events.CallbackQuery(pattern=b"save_kind_"))
async def save_kind_callback(event):
    """Save selected kind to database"""
    try:
        data = event.data.decode()
        username = data.replace("save_kind_", "")
        
        user_id = event.sender_id
        
        # Ambil kind yang dipilih dari user state
        selected_kind = None
        if user_id in user_state and user_state[user_id].get("action") == "kind_selected":
            selected_kind = user_state[user_id].get("selected_kind")
        
        if not selected_kind:
            # Jika tidak ada di state, ambil dari database
            current_kind = db.get_username_kind(username)
            await event.answer(f"Kind saat ini: {current_kind} (tidak ada perubahan)", alert=True)
            return
        
        # Update database
        success = db.update_kind(username, selected_kind)
        
        if success:
            await event.answer(f"✅ Kind berhasil disimpan: {selected_kind}", alert=True)
            
            # Hapus dari state
            if user_id in user_state:
                del user_state[user_id]
            
            # Refresh tampilan detail
            await show_username_detail(event, username)
        else:
            await event.answer("❌ Gagal menyimpan kind!", alert=True)
        
    except Exception as e:
        print(f"Error in save_kind_callback: {e}")
        await event.answer("❌ Terjadi kesalahan!", alert=True)

@bot.on(events.CallbackQuery(data=b"help"))
async def help_callback(event):
    await event.answer()
    await event.edit("📝 **BANTUAN**\n\nBot ini digunakan untuk menambahkan username channel atau user ke database INDOTAG MARKET.\n\nKlik **➕ ADD USERNAME** untuk memulai.")

@bot.on(events.CallbackQuery(data=b"my_usn"))
async def my_usn_callback(event):
    """Handle my_usn button - show list of user's saved usernames"""
    await event.answer()
    user_id = event.sender_id
    
    # Get all usernames added by this user
    usernames = db.get_user_added_usernames(user_id)
    
    if not usernames:
        await event.respond("📭 **Anda belum memiliki username yang tersimpan.**\n\nGunakan fitur **➕ ADD USERNAME** untuk menambahkan username.")
        return
    
    # Debug: lihat struktur data
    if usernames:
        print(f"Sample username data: {usernames[0]}")
        print(f"Length: {len(usernames[0])}")
    
    # Create message
    total = len(usernames)
    msg = f"📋 **Daftar Username Anda**\nTotal: {total} username\n\nSilakan pilih username untuk melihat detail:"
    
    # Create buttons (2 per row)
    buttons = []
    row = []
    
    for i, usn_data in enumerate(usernames, 1):
        username = usn_data[1]  # username di index 1
        display_name = f"@{username}"
        
        button = Button.inline(display_name, data=f"usn_{username}".encode())
        row.append(button)
        
        if len(row) == 2 or i == len(usernames):
            buttons.append(row)
            row = []
    
    buttons.append([Button.inline("◀️ Kembali", b"back_to_menu")])
    
    await event.edit(msg, buttons=buttons)

@bot.on(events.CallbackQuery(pattern=b"usn_"))
async def usn_detail_callback(event):
    """Handle username detail button - show detailed info about selected username"""
    try:
        data = event.data.decode()
        username = data.replace("usn_", "")
        
        print(f"Detail request for username: {username}")  # Debug log
        
        # Panggil helper function
        await show_username_detail(event, username)
        
    except Exception as e:
        error_msg = f"Error in usn_detail_callback: {str(e)}"
        print(error_msg)
        await event.answer("❌ Terjadi kesalahan!", alert=True)

@bot.on(events.CallbackQuery(pattern=b"set_bo"))
async def set_based_on_callback(event):
    """Handle based on button - set based on value"""
    try:
        # Dapatkan pesan yang terkait dengan callback
        msg = await event.get_message()
        if not msg or not msg.text:
            await event.answer("❌ Tidak dapat membaca pesan!", alert=True)
            return
        
        # Extract username from message (format: @username)
        import re
        username_match = re.search(r'@(\w+)', msg.text)
        if not username_match:
            await event.answer("❌ Tidak dapat menemukan username!", alert=True)
            return
        
        username = username_match.group(1)
        user_id = event.sender_id
        
        # Store in user state
        user_state[user_id] = {
            "action": "waiting_based_on",
            "username": username,
            "callback_event": event  # Simpan event callback untuk refresh nanti
        }
        
        await event.respond(
            f"📝 **Set Based On untuk @{username}**\n\n"
            "Based on adalah nama dasar dari username ini.\n"
            "Contoh: @sengdok → based on: sendok (huruf 'g' dihilangkan)\n\n"
            "Silakan kirim based on yang sesuai:"
        )
        await event.answer()
        
    except Exception as e:
        print(f"Error in set_based_on_callback: {e}")
        await event.answer("❌ Terjadi kesalahan!", alert=True)

@bot.on(events.CallbackQuery(pattern=b"tag_stats"))
async def tag_stats_callback(event):
    """Placeholder for tag stats"""
    await event.answer("🛒 Fitur Tag Stats akan segera hadir!", alert=True)

@bot.on(events.CallbackQuery(pattern=b"set_price"))
async def set_price_callback(event):
    """Handle set price button"""
    try:
        # Dapatkan pesan yang terkait dengan callback
        msg = await event.get_message()
        if not msg or not msg.text:
            await event.answer("❌ Tidak dapat membaca pesan!", alert=True)
            return
        
        # Extract username from message
        import re
        username_match = re.search(r'@(\w+)', msg.text)
        if not username_match:
            await event.answer("❌ Tidak dapat menemukan username!", alert=True)
            return
        
        username = username_match.group(1)
        user_id = event.sender_id
        
        # Store in user state dengan callback_event
        user_state[user_id] = {
            "action": "waiting_price",
            "username": username,
            "callback_event": event  # Simpan event callback untuk refresh
        }
        
        await event.respond(
            f"💰 **Set Harga untuk @{username}**\n\n"
            "Masukkan harga dalam Rupiah (angka saja tanpa titik atau koma)\n"
            "Contoh: 100000 untuk Rp 100.000\n\n"
            "Ketik /cancel untuk membatalkan."
        )
        await event.answer()
        
    except Exception as e:
        print(f"Error in set_price_callback: {e}")
        await event.answer("❌ Terjadi kesalahan!", alert=True)

@bot.on(events.CallbackQuery(pattern=b"my_activity"))
async def my_activity_callback(event):
    """Handle activity button - show activity logs"""
    try:
        user_id = event.sender_id
        page = 1
        
        # Dapatkan username dari pesan
        msg = await event.get_message()
        username = None
        if msg and msg.text:
            import re
            username_match = re.search(r'@(\w+)', msg.text)
            if username_match:
                username = username_match.group(1)
        
        # Get activity logs
        logs, total = db.get_activity_logs(user_id, page)
        
        if not logs:
            await event.respond("📭 **Belum ada aktivitas**\n\nBelum ada catatan aktivitas untuk akun Anda.")
            await event.answer()
            return
        
        # Format message
        total_pages = (total + 9) // 10
        msg_text = f"📊 **Activity Log**\nHalaman {page}/{total_pages}\nTotal: {total} aktivitas\n\n"
        
        for i, log in enumerate(logs, 1):
            # log structure: id, username, user_id, action, details, created_at
            log_action = log[3]  # action
            log_details = log[4]  # details
            log_time = format_jakarta_time(log[5])  # created_at
            
            # Get emoji
            emoji = "📌"
            if "USERNAME_ADDED" in log_action:
                emoji = "➕"
            elif "BASED_ON" in log_action:
                emoji = "💠"
            elif "PRICE" in log_action:
                emoji = "💰"
            elif "LISTED" in log_action:
                emoji = "🛒"
            elif "VERIFY" in log_action:
                emoji = "✅"
            elif "USER_START" in log_action:
                emoji = "🚀"
            
            msg_text += f"{emoji} **{log_time}**\n{log_details}\n\n"
        
        # Create buttons
        buttons = []
        
        # Navigation
        nav_buttons = []
        if page > 1:
            nav_buttons.append(Button.inline("⬅️ Sebelumnya", data=f"activity_page_{page-1}".encode()))
        if page < total_pages:
            nav_buttons.append(Button.inline("➡️ Selanjutnya", data=f"activity_page_{page+1}".encode()))
        
        if nav_buttons:
            buttons.append(nav_buttons)
        
        # Back button
        if username:
            buttons.append([Button.inline("◀️ Kembali", data=f"usn_{username}".encode())])
        else:
            buttons.append([Button.inline("◀️ Kembali ke Menu", b"back_to_menu")])
        
        await event.edit(msg_text, buttons=buttons)
        await event.answer()
        
    except Exception as e:
        print(f"Error in my_activity_callback: {e}")
        await event.answer("❌ Terjadi kesalahan!", alert=True)

@bot.on(events.CallbackQuery(pattern=b"activity_page_"))
async def activity_page_callback(event):
    """Handle activity pagination"""
    try:
        data = event.data.decode()
        page = int(data.replace("activity_page_", ""))
        user_id = event.sender_id
        
        # Dapatkan username dari pesan untuk tombol kembali
        msg = await event.get_message()
        username = None
        if msg and msg.text:
            import re
            username_match = re.search(r'@(\w+)', msg.text)
            if username_match:
                username = username_match.group(1)
        
        # Get activity logs for this page
        logs, total = db.get_activity_logs(user_id, page)
        total_pages = (total + 9) // 10
        
        # Format message
        msg_text = f"📊 **Activity Log**\nHalaman {page}/{total_pages}\nTotal: {total} aktivitas\n\n"
        
        for i, log in enumerate(logs, 1):
            log_action = log[3]  # action
            log_details = log[4]  # details
            log_time = format_jakarta_time(log[5])  # created_at
            
            # Get emoji for action type
            emoji = "📌"
            if "USERNAME_ADDED" in log_action:
                emoji = "➕"
            elif "BASED_ON" in log_action:
                emoji = "💠"
            elif "PRICE" in log_action:
                emoji = "💰"
            elif "LISTED" in log_action:
                emoji = "🛒"
            elif "VERIFY" in log_action:
                emoji = "✅"
            elif "USER_START" in log_action:
                emoji = "🚀"
            
            msg_text += f"{emoji} **{log_time}**\n{log_details}\n\n"
        
        # Create pagination buttons
        buttons = []
        
        # Navigation buttons
        nav_buttons = []
        if page > 1:
            nav_buttons.append(Button.inline("⬅️ Sebelumnya", data=f"activity_page_{page-1}".encode()))
        if page < total_pages:
            nav_buttons.append(Button.inline("➡️ Selanjutnya", data=f"activity_page_{page+1}".encode()))
        
        if nav_buttons:
            buttons.append(nav_buttons)
        
        # Back button
        if username:
            buttons.append([Button.inline("◀️ Kembali", data=f"usn_{username}".encode())])
        else:
            buttons.append([Button.inline("◀️ Kembali ke Menu", b"back_to_menu")])
        
        await event.edit(msg_text, buttons=buttons)
        await event.answer()
        
    except Exception as e:
        print(f"Error in activity_page_callback: {e}")
        await event.answer("❌ Terjadi kesalahan!", alert=True)

@bot.on(events.CallbackQuery(pattern=b"usn_refresh_"))
async def usn_refresh_callback(event):
    """Refresh username detail view"""
    try:
        data = event.data.decode()
        username = data.replace("usn_refresh_", "")
        
        # Get fresh data from database
        await show_username_detail(event, username)
        
    except Exception as e:
        print(f"Error in usn_refresh_callback: {e}")
        await event.answer("❌ Terjadi kesalahan!", alert=True)

@bot.on(events.CallbackQuery(pattern=b"toggle_listed_"))
async def toggle_listed_callback(event):
    """Toggle listed/unlisted status"""
    try:
        data = event.data.decode()
        username = data.replace("toggle_listed_", "")
        
        print(f"\n🔄 Toggling listed status for: {username}")
        
        # Get current status
        usn_detail = db.get_username_detail(username)
        if not usn_detail:
            await event.answer("❌ Data username tidak ditemukan!", alert=True)
            return
        
        # listed_status ada di index 10 (dari query SELECT yang sudah diperbaiki)
        current_status = usn_detail[10]
        print(f"Current status from DB: '{current_status}'")
        
        # Toggle status
        if current_status == 'listed':
            new_status = 'unlisted'
            status_text = "UNLISTED"
        else:
            new_status = 'listed'
            status_text = "LISTED"
        
        print(f"New status: {new_status}")
        
        # Update database
        success = db.update_listed_status(username, new_status)
        
        if success:
            await event.answer(f"✅ Status berhasil diubah menjadi {status_text}", alert=True)
            # Ambil data terbaru
            await asyncio.sleep(0.3)
            await show_username_detail(event, username)
        else:
            await event.answer("❌ Gagal mengubah status!", alert=True)
            
    except Exception as e:
        print(f"Error in toggle_listed_callback: {e}")
        import traceback
        traceback.print_exc()
        await event.answer("❌ Terjadi kesalahan!", alert=True)

@bot.on(events.CallbackQuery(data=b"back_to_menu"))
async def back_to_menu_callback(event):
    user_id = event.sender_id
    
    await event.delete()
    await start(event)

@bot.on(events.CallbackQuery(data=b"add_usn"))
async def add_usn_callback(event):
    await event.answer()
    user_id = event.sender_id
    
    # Set user state
    user_state[user_id] = {"action": "waiting_username"}
    print(f"User {user_id} state set to waiting_username")  # Debug
    
    await event.respond("📝 **Silakan kirim username yang ingin ditambahkan**\nContoh: `@username`\n\nKetik /cancel untuk membatalkan.")

@bot.on(events.NewMessage(pattern="^/cancel$"))
async def cancel_handler(event):
    user_id = event.sender_id
    if user_id in user_state:
        print(f"User {user_id} cancelled. State: {user_state[user_id]}")  # Debug
        del user_state[user_id]
        await event.respond("✅ **Proses dibatalkan**")
    else:
        await event.respond("❌ **Tidak ada proses yang sedang berjalan**")

@bot.on(events.NewMessage)
async def message_handler(event):
    user_id = event.sender_id
    
    # Skip if message is a command
    if event.message.text and event.message.text.startswith('/'):
        return
    
    # Check if user is in a state
    if user_id not in user_state:
        return
    
    state = user_state[user_id]
    print(f"User {user_id} in state: {state}")  # Debug log
    
    action = state.get("action")
    
    if action == "waiting_username":
        # Process username input
        username_input = event.message.text.strip()
        
        # Validate username format
        if not username_input.startswith('@'):
            await event.respond("❌ **Format username salah!**\nHarus dimulai dengan @\nContoh: @username\n\nSilakan coba lagi atau ketik /cancel")
            return
        
        # Check if it's a channel or user
        entity = await get_entity_info(username_input)
        
        if not entity:
            await event.respond("❌ **Username tidak ditemukan!**\nPastikan username benar dan coba lagi.\n\nKetik /cancel untuk membatalkan.")
            return
        
        # Determine entity type
        if isinstance(entity, types.Channel):
            # It's a channel
            await process_channel_username(event, username_input, entity, user_id)
        elif isinstance(entity, types.User):
            # It's a user
            await process_user_username(event, username_input, entity, user_id)
        else:
            await event.respond("❌ **Tipe username tidak dikenali!**\nHanya channel atau user yang didukung.")
            if user_id in user_state:
                del user_state[user_id]
    
    elif action == "waiting_otp":
        # Process OTP input
        await process_otp_input(event, state)
        
    elif action == "waiting_based_on":
        # Process based on input
        based_on_input = event.message.text.strip()  # Simpan original dengan spasi
        username = state.get("username")
        callback_event = state.get("callback_event")  # Ambil callback event
        
        if not username:
            del user_state[user_id]
            return
        
        # Remove @ if present
        clean_username = username[1:] if username.startswith('@') else username
        clean_username_lower = clean_username.lower()
        
        # Buat versi tanpa spasi untuk validasi saja
        based_on_no_spaces = based_on_input.replace(' ', '')
        based_on_lower = based_on_no_spaces.lower()
        
        if len(based_on_lower) > len(clean_username_lower):
            await event.respond(
                "❌ **Based On tidak valid!**\n\n"
                "Based on tidak boleh lebih panjang dari username (setelah spasi dihapus).\n"
                f"Username: @{clean_username} ({len(clean_username_lower)} karakter)\n"
                f"Based on (tanpa spasi): {based_on_no_spaces} ({len(based_on_lower)} karakter)\n\n"
                "Silakan coba lagi atau ketik /cancel"
            )
            return
        
        # DETEKSI JENIS USERNAME (gunakan versi tanpa spasi untuk validasi)
        detected_type = None
        
        # 1. CEK OP (On Point) - tanpa perubahan
        if based_on_lower == clean_username_lower:
            detected_type = "OP"
        
        # 2. CEK SCANON - penambahan 's' di akhir
        elif based_on_lower + 's' == clean_username_lower:
            detected_type = "SCANON"
        
        # 3. CEK SOP (Semi On Point) - double letters
        elif len(based_on_lower) < len(clean_username_lower):
            # Cek double letters (contoh: win -> wiin, rose -> roose)
            is_sop = False
            for i in range(len(based_on_lower)):
                # Cek double di posisi i
                if (based_on_lower[:i+1] + based_on_lower[i] + based_on_lower[i+1:]) == clean_username_lower:
                    is_sop = True
                    break
            if is_sop:
                detected_type = "SOP"
        
        # 4. CEK CANON - penggantian i ke l atau l ke i
        elif len(based_on_lower) == len(clean_username_lower):
            is_canon = True
            diff_count = 0
            for a, b in zip(clean_username_lower, based_on_lower):
                if a != b:
                    # Cek apakah perbedaan adalah i↔l
                    if (a == 'i' and b == 'l') or (a == 'l' and b == 'i'):
                        diff_count += 1
                    else:
                        is_canon = False
                        break
            if is_canon and diff_count > 0:
                detected_type = "CANON"
        
        # 5. CEK TAMPING (Tambah Pinggir) - tambah huruf di depan atau belakang
        elif len(based_on_lower) + 1 == len(clean_username_lower):
            if clean_username_lower.startswith(based_on_lower) or clean_username_lower.endswith(based_on_lower):
                detected_type = "TAMPING"
        
        # 6. CEK TAMDAL (Tambah Dalam) - tambah huruf di tengah
        elif len(based_on_lower) + 1 == len(clean_username_lower):
            for i in range(len(based_on_lower)):
                # Cek apakah ada huruf tambahan di posisi i
                if (clean_username_lower.startswith(based_on_lower[:i]) and 
                    clean_username_lower[i+1:].startswith(based_on_lower[i:])):
                    detected_type = "TAMDAL"
                    break
        
        # 7. CEK GANHUR (Ganti Huruf) - ganti 1 huruf
        elif len(based_on_lower) == len(clean_username_lower):
            diff_count = 0
            for a, b in zip(clean_username_lower, based_on_lower):
                if a != b:
                    diff_count += 1
            if diff_count == 1:
                detected_type = "GANHUR"
        
        # 8. CEK SWITCH (Perpindahan Huruf) - swap 2 huruf berdekatan
        elif len(based_on_lower) == len(clean_username_lower):
            for i in range(len(based_on_lower) - 1):
                # Swap huruf di posisi i dan i+1
                switched = based_on_lower[:i] + based_on_lower[i+1] + based_on_lower[i] + based_on_lower[i+2:]
                if switched == clean_username_lower:
                    detected_type = "SWITCH"
                    break
        
        # 9. CEK KURHUF (Kurang Huruf) - kurang 1 huruf
        elif len(based_on_lower) == len(clean_username_lower) + 1:
            for i in range(len(based_on_lower)):
                # Hapus 1 huruf di posisi i
                removed = based_on_lower[:i] + based_on_lower[i+1:]
                if removed == clean_username_lower:
                    detected_type = "KURHUF"
                    break
        
        # Jika tidak terdeteksi, cek apakah berdasarkan aturan umum (OP)
        if not detected_type:
            # Cek apakah based_on bisa menjadi dasar dari username (berdasarkan panjang)
            if len(based_on_lower) < len(clean_username_lower):
                detected_type = "OP"
            elif len(based_on_lower) == len(clean_username_lower):
                detected_type = "OP"
            else:
                # Tidak valid
                await event.respond(
                    f"❌ **Based On tidak valid untuk @{clean_username}!**\n\n"
                    f"Tidak dapat menemukan hubungan antara '{based_on_input}' dan '@{clean_username}'.\n\n"
                    "Silakan coba lagi dengan format yang benar atau ketik /cancel"
                )
                return
        

        if ' ' in based_on_input:
            print(f"New saved: '{based_on_input}'")
        
        # UPDATE DATABASE - GUNAKAN INPUT ASLI DENGAN SPASI
        success = db.update_based_on(username, based_on_input)  # Simpan dengan spasi!
        
        if success:
            response_msg = f"✅ **Based On berhasil di set!**\n@{clean_username} → '{based_on_input}'\n\n"
            response_msg += f"**Tipe Terdeteksi:** {detected_type}"
            
            # Tambahkan informasi tipe
            type_info = {
                "OP": "On Point - tanpa perubahan",
                "SOP": "Semi On Point - double letters",
                "SCANON": "Scanon - tambah 's' di akhir",
                "CANON": "Canon - i ↔ l",
                "TAMPING": "Tambah Pinggir - tambah huruf di depan/belakang",
                "TAMDAL": "Tambah Dalam - tambah huruf di tengah",
                "GANHUR": "Ganti Huruf - ganti 1 huruf",
                "SWITCH": "Switch - pertukaran huruf berdekatan",
                "KURHUF": "Kurang Huruf - kurang 1 huruf"
            }
            
            if detected_type in type_info:
                response_msg += f"\n_{type_info[detected_type]}_"
            
            await event.respond(response_msg)
            
            # Gunakan callback_event untuk refresh jika ada
            if callback_event:
                await show_username_detail(callback_event, username)
            else:
                await show_username_detail(event, username)
        else:
            await event.respond("❌ **Gagal menyimpan Based On!**")
        
        del user_state[user_id]
        
    elif action == "waiting_price":
        # Process price input
        price_input = event.message.text.strip()
        username = state.get("username")
        callback_event = state.get("callback_event")  # Ambil callback event
        
        if not username:
            await event.respond("❌ **Sesi tidak valid!**\nSilakan mulai ulang.")
            del user_state[user_id]
            return
        
        # Validate price (must be number)
        try:
            price = int(price_input)
            if price < 0:
                raise ValueError("Price cannot be negative")
        except:
            await event.respond(
                "❌ **Harga tidak valid!**\n\n"
                "Masukkan angka positif tanpa titik atau koma.\n"
                "Contoh: 100000 untuk Rp 100.000\n\n"
                "Silakan coba lagi atau ketik /cancel"
            )
            return
        
        # Update database
        success = db.update_price(username, price)
        
        if success:
            formatted_price = f"Rp {price:,}"
            await event.respond(f"✅ **Harga berhasil di set!**\n@{username} → {formatted_price}")
            
            # Gunakan callback_event untuk refresh jika ada
            if callback_event:
                await show_username_detail(callback_event, username)
            else:
                await show_username_detail(event, username)
        else:
            await event.respond("❌ **Gagal menyimpan harga!**")
        
        del user_state[user_id]

async def process_otp_input(event, state):
    """Process OTP input from user"""
    user_id = event.sender_id
    otp_input = event.message.text.strip()
    session_id = state.get("session_id")
    requester_id = state.get("requester_id", user_id)
    
    print(f"Processing OTP input: {otp_input} for session: {session_id}")  # Debug log
    
    if not session_id:
        await event.respond("❌ **Sesi tidak valid!**\nSilakan mulai ulang dengan /start")
        if user_id in user_state:
            del user_state[user_id]
        return
    
    # Get session from database
    session = db.get_verification_session(session_id)
    
    if not session:
        await event.respond("❌ **Sesi tidak ditemukan!**\nSilakan mulai ulang dengan /start")
        if user_id in user_state:
            del user_state[user_id]
        return
    
    print(f"Session data: {session}")  # Debug log
    
    # Check OTP (session[6] is otp_code)
    if otp_input == session[6]:
        # OTP correct
        username = session[2]  # username
        type_ = session[3]  # type
        requester_id_from_db = session[4]  # requester_id
        owner_id = session[5]  # owner_id
        
        # Get owner info
        try:
            owner_entity = await bot.get_entity(owner_id)
            owner_username = owner_entity.username if owner_entity else None
        except Exception as e:
            print(f"Error getting owner entity: {e}")
            owner_username = None
        
        # Clean username
        clean_username = username[1:] if username.startswith('@') else username
        
        # Add to database
        success = db.add_username_request(clean_username, type_, owner_id, owner_username, requester_id_from_db)
        
        if success:
            await event.respond(f"✅ **Berhasil!**\nUsername @{clean_username} telah ditambahkan ke database.")
            
            # Update session status
            db.update_verification_session(session_id, status="verified")
            
            # Notify requester if different from current user
            if requester_id_from_db != user_id:
                try:
                    await bot.send_message(requester_id_from_db, f"✅ **Verifikasi Berhasil!**\nUsername @{clean_username} telah berhasil diverifikasi dan ditambahkan ke database.")
                except Exception as e:
                    print(f"Error notifying requester: {e}")
        else:
            await event.respond("❌ **Gagal menambahkan ke database!**\nMungkin username sudah terdaftar.")
        
        # Clear user state
        if user_id in user_state:
            del user_state[user_id]
    else:
        # OTP wrong
        await event.respond("❌ **Kode OTP salah!**\nSilakan coba lagi atau ketik /cancel untuk membatalkan.")
        # Keep state - don't delete

async def process_channel_username(event, username_input, channel, requester_id):
    """Process channel username verification (Improved version)"""
    try:
        print(f"Processing channel username: {username_input}")
        clean_username = username_input[1:] if username_input.startswith('@') else username_input
        creator_id = None
        creator_username = None

        # --- METODE PALING ANDAL: Gunakan functions.channels.GetFullChannelRequest ---
        try:
            print("Mencoba mendapatkan informasi lengkap channel dengan GetFullChannelRequest...")
            # Dapatkan objek channel yang lengkap (bukan versi "minimal")
            full_channel = await bot(functions.channels.GetFullChannelRequest(channel))
            
            # Informasi lengkap channel ada di full_channel.chats
            # Biasanya berisi satu objek Channel dengan atribut 'creator' dan 'id'
            if full_channel and hasattr(full_channel, 'chats') and full_channel.chats:
                for chat in full_channel.chats:
                    # Cek apakah ini channel yang dimaksud dan apakah creator-nya diketahui
                    if isinstance(chat, types.Channel) and chat.id == channel.id:
                        # Atribut 'creator' (boolean) menandakan apakah pengguna yang terautentikasi (bot) adalah creator.
                        # Tapi kita butuh ID creator-nya.
                        # Coba cari di 'participants' atau data lain. Sayangnya, API sering tidak mengembalikan ID creator langsung.
                        # Pendekatan ini mungkin tetap gagal.
                        print(f"Info channel dari GetFullChannel: creator={getattr(chat, 'creator', False)}")
                        
                        # Sebagai fallback, kita bisa gunakan data dari peserta jika ada.
                        # Namun, cara paling umum adalah dengan meminta salah satu admin mengklik tombol verifikasi.
                        # Kita akan asumsikan creator adalah admin pertama yang bukan bot? Ini tidak akurat.
                        pass

            # Cara alternatif: Lihat di 'full_chat' (full_channel.full_chat)
            if hasattr(full_channel, 'full_chat') and full_channel.full_chat:
                 # Tidak ada informasi creator di sini biasanya.
                 pass

        except Exception as e:
            print(f"Error saat GetFullChannelRequest: {e}")

        # --- METODE KEDUA (YANG SUDAH ADA, TAPI DIPERBAIKI) ---
        if not creator_id:
            try:
                print("Mencoba mencari creator dari daftar admin...")
                admins = await bot.get_participants(channel, filter=types.ChannelParticipantsAdmins)
                print(f"Ditemukan {len(admins)} admin.")

                for admin in admins:
                    # Cara yang lebih baik untuk mengecek apakah admin adalah creator
                    # Kita bisa mencoba mendapatkan hak admin yang lebih detail melalui peserta penuh
                    try:
                        # Dapatkan partisipan penuh untuk admin ini
                        participant = await bot(functions.channels.GetParticipantRequest(
                            channel=channel,
                            participant=admin.id
                        ))
                        # Periksa apakah partisipan ini adalah creator
                        if hasattr(participant, 'participant') and isinstance(participant.participant, types.ChannelParticipantCreator):
                            creator_id = admin.id
                            creator_username = admin.username
                            print(f"Creator ditemukan dari GetParticipantRequest: {creator_id}")
                            break
                    except Exception as e:
                        # Fallback: Jika GetParticipantRequest gagal, gunakan cara lama
                        if hasattr(admin, 'admin_rights') and admin.admin_rights and admin.admin_rights.is_creator:
                            creator_id = admin.id
                            creator_username = admin.username
                            print(f"Creator ditemukan dari admin_rights.is_creator: {creator_id}")
                            break
                        elif hasattr(admin, 'participant') and hasattr(admin.participant, 'is_creator') and admin.participant.is_creator:
                            creator_id = admin.id
                            creator_username = admin.username
                            print(f"Creator ditemukan dari participant.is_creator: {creator_id}")
                            break

            except Exception as e:
                print(f"Error saat memproses admin: {e}")

        # --- Jika masih tidak ditemukan, minta bantuan user ---
        if not creator_id:
            error_msg = (
                "❌ **Tidak dapat menemukan owner channel secara otomatis.**\n\n"
                "Ini bisa terjadi karena:\n"
                "1. Bot tidak memiliki hak istimewa yang cukup (pastikan bot adalah **Admin** dengan hak **'Manage Channel'** atau setara).\n"
                "2. Keterbatasan API Telegram.\n\n"
                "**Solusi:**\n"
                "Pastikan bot adalah admin, lalu minta **salah satu admin channel** (minimal yang bisa menghapus/mengubah info channel) untuk menekan tombol verifikasi. Bot akan tetap memproses siapa pun admin yang menekan tombol sebagai pemilik untuk keperluan verifikasi ini."
            )
            print("Creator ID tidak ditemukan.")
            await event.respond(error_msg)
            
            # Tetap buat sesi verifikasi dengan mengirim pesan ke channel
            # Siapa pun admin yang menekan tombol nanti akan diverifikasi.
            verification_id = db.generate_verification_id()
            session_id = db.create_verification_session(
                verification_id,
                clean_username,
                "channel",
                requester_id,
                owner_id=None  # Owner ID tidak diketahui, akan diisi saat tombol ditekan
            )

            try:
                buttons = [[Button.inline("✅ Verifikasi Channel (Sebagai Admin)", data=f"verify_admin_{verification_id}".encode())]]
                verification_msg = f"""
🔔 **Verifikasi Channel Diperlukan**

Channel: @{clean_username}
Pengirim: [{event.sender.first_name}](tg://user?id={requester_id})

Klik tombol di bawah untuk **memverifikasi sebagai admin channel**. 
*Catatan: Sistem akan menganggap admin yang menekan tombol ini sebagai pemilik untuk keperluan pencatatan.*
                """
                await bot.send_message(username_input, verification_msg, buttons=buttons)
                await event.respond(f"✅ **Pesan verifikasi telah dikirim ke channel @{clean_username}**\n\nSiapa pun admin channel yang menekan tombol verifikasi akan dianggap sebagai pemilik untuk proses ini.")
            except Exception as e:
                await event.respond(f"❌ Gagal mengirim pesan ke channel: {e}")
            return

        # --- Jika creator_id ditemukan, lanjutkan seperti biasa ---
        verification_id = db.generate_verification_id()
        session_id = db.create_verification_session(
            verification_id,
            clean_username,
            "channel",
            requester_id,
            owner_id=creator_id
        )

        try:
            buttons = [[Button.inline("✅ Verifikasi Channel", data=f"verify_{verification_id}".encode())]]
            verification_msg = f"""
🔔 **Verifikasi Channel Diperlukan**

Channel: @{clean_username}
Pengirim: [{event.sender.first_name}](tg://user?id={requester_id})

Klik tombol di bawah untuk memverifikasi bahwa Anda adalah owner channel ini.
            """
            await bot.send_message(username_input, verification_msg, buttons=buttons)
            await event.respond(f"✅ **Pesan verifikasi telah dikirim ke channel @{clean_username}**\n\nOwner channel harus menekan tombol verifikasi untuk menyelesaikan proses.")
        except Exception as e:
            await event.respond(f"❌ Gagal mengirim pesan ke channel: {e}")

    except Exception as e:
        error_msg = f"Terjadi kesalahan kritis: {str(e)}"
        print(error_msg)
        await event.respond(f"❌ **{error_msg}**")

async def process_user_username(event, username_input, user_entity, requester_id):
    """Process user username verification"""
    try:
        print(f"Processing user username: {username_input}")  # Debug log
        
        # Clean username
        clean_username = username_input[1:] if username_input.startswith('@') else username_input
        
        # Check if user exists in our database
        user_data = db.get_user_by_username(clean_username)
        
        if not user_data:
            # User hasn't started the bot
            await event.respond(f"❌ **User @{clean_username} belum menggunakan bot ini!**\n\nUser tersebut harus memulai bot ini terlebih dahulu dengan mengirim /start")
            return
        
        print(f"User data found: {user_data}")  # Debug log
        
        # Generate OTP
        otp_code = db.generate_otp()
        print(f"Generated OTP: {otp_code}")  # Debug log
        
        # Generate session ID
        verification_id = db.generate_verification_id()
        
        # Create verification session
        session_id = db.create_verification_session(
            verification_id,
            clean_username,
            "user",
            requester_id,
            owner_id=user_entity.id,
            otp_code=otp_code
        )
        
        if not session_id:
            await event.respond("❌ **Gagal membuat sesi verifikasi!**")
            return
        
        print(f"Created verification session: {session_id}")  # Debug log
        
        # Send OTP to the target user
        try:
            otp_msg = f"""
🔐 **Kode Verifikasi**

Seseorang ingin menambahkan username Anda (@{clean_username}) ke database INDOTAG MARKET.

Kode verifikasi Anda: `{otp_code}`

Jangan bagikan kode ini kepada siapapun.
            """
            await bot.send_message(user_entity.id, otp_msg)
            print(f"OTP sent to user {user_entity.id}")  # Debug log
            
            # Ask requester to input OTP
            await event.respond(f"✅ **Kode OTP telah dikirim ke @{clean_username}**\n\nSilakan minta kode tersebut dan kirimkan ke bot ini.\n\nKetik /cancel untuk membatalkan.")
            
            # Set user state to waiting for OTP
            user_state[requester_id] = {
                "action": "waiting_otp",
                "session_id": verification_id,
                "requester_id": requester_id
            }
            print(f"User state set for {requester_id}: waiting_otp with session {verification_id}")  # Debug log
            
        except Exception as e:
            error_msg = f"Gagal mengirim OTP ke user! Error: {str(e)}"
            print(error_msg)
            await event.respond(f"❌ **{error_msg}**")
            
    except Exception as e:
        error_msg = f"Terjadi kesalahan saat memproses user: {str(e)}"
        print(error_msg)
        await event.respond(f"❌ **{error_msg}**")

@bot.on(events.CallbackQuery(pattern=b"verify_"))
async def verify_callback(event):
    """Handle verification button press"""
    try:
        data = event.data.decode()
        verification_id = data.replace("verify_", "")
        
        print(f"Verification callback received for ID: {verification_id}")  # Debug log
        
        # Get session from database
        session = db.get_verification_session(verification_id)
        
        if not session:
            await event.answer("❌ Sesi tidak valid atau sudah kadaluarsa!", alert=True)
            return
        
        print(f"Session found: {session}")  # Debug log
        
        # Check if the user pressing button is the owner
        user_id = event.sender_id
        session_owner_id = session[5]  # owner_id at index 5
        session_type = session[3]  # type at index 3
        username = session[2]  # username at index 2
        requester_id = session[4]  # requester_id at index 4
        
        if user_id != session_owner_id:
            await event.answer("❌ Anda bukan owner dari username ini!", alert=True)
            return
        
        # Update session status
        db.update_verification_session(verification_id, status="verified")
        
        # Get owner info
        try:
            owner_entity = await bot.get_entity(user_id)
            owner_username = owner_entity.username if owner_entity else None
        except Exception as e:
            print(f"Error getting owner entity: {e}")
            owner_username = None
        
        # Add to added_usernames table
        success = db.add_username_request(username, session_type, user_id, owner_username, requester_id)
        
        if success:
            await event.edit(f"✅ **Verifikasi Berhasil!**\nUsername @{username} telah diverifikasi dan ditambahkan ke database.")
            await event.answer("✅ Verifikasi berhasil!", alert=True)
            
            # Notify requester
            try:
                await bot.send_message(requester_id, f"✅ **Verifikasi Berhasil!**\nUsername @{username} telah berhasil diverifikasi oleh owner dan ditambahkan ke database.")
                print(f"Requester {requester_id} notified")  # Debug log
            except Exception as e:
                print(f"Error notifying requester: {e}")
        else:
            await event.answer("❌ Gagal menambahkan ke database!", alert=True)
            
    except Exception as e:
        error_msg = f"Error in verify_callback: {str(e)}"
        print(error_msg)
        await event.answer("❌ Terjadi kesalahan!", alert=True)

async def main():
    """Main function to start bot and processor"""
    try:
        # Start bot processor
        await bot_processor.start()
        print("✅ Bot Processor for Web App started and running")
        print("✅ Bot berjalan...")
        print("Debug mode: ON - Errors will be printed to console")
        
        # Run bot until disconnected
        await bot.run_until_disconnected()
    except Exception as e:
        print(f"❌ Error in main: {e}")
        traceback.print_exc()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n✅ Bot stopped by user")
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        traceback.print_exc()