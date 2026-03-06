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