// ==================== KONFIGURASI ====================
const API_BASE_URL = 'https://covers-instructional-warehouse-samuel.trycloudflare.com';

// State
let currentMode = 'login';
let telegramUser = null;

function getTelegramUser() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        const user = tg.initDataUnsafe?.user;
        if (user) {
            console.log('✅ Data Telegram:', user);
            return user;
        }
    }
    console.log('⚠️ Tidak di Telegram WebApp');
    return null;
}

// ==================== TAMPILKAN KARTU TELEGRAM ====================
function showTelegramCard(user) {
    if (!user) return;
    
    const card = document.getElementById('telegramCard');
    const avatar = document.getElementById('telegramAvatar');
    const nameEl = document.getElementById('telegramName');
    const usernameEl = document.getElementById('telegramUsername');
    const premiumBadge = document.getElementById('premiumBadge');
    
    // Set avatar dengan inisial
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'U';
    avatar.textContent = initials;
    
    // Set nama lengkap
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Pengguna Telegram';
    nameEl.textContent = fullName;
    
    // Set username
    usernameEl.textContent = user.username ? `@${user.username}` : '(tanpa username)';
    
    // Set premium badge
    if (user.is_premium) {
        premiumBadge.style.display = 'inline-block';
    } else {
        premiumBadge.style.display = 'none';
    }
    
    // Simpan data Telegram ke sessionStorage juga (untuk digunakan nanti)
    sessionStorage.setItem('telegram_user', JSON.stringify(user));
    
    // Simpan data Telegram ke hidden input
    document.getElementById('telegramData').value = JSON.stringify(user);
    
    // Tampilkan card
    card.style.display = 'block';
}

// ==================== VALIDASI FORM ====================
function validateForm(username, email, password) {
    if (!username || username.length < 3) {
        return 'Username minimal 3 karakter';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Email tidak valid';
    }
    
    if (!password || password.length < 6) {
        return 'Password minimal 6 karakter';
    }
    
    return null;
}

// ==================== SHOW LOADING ====================
function showLoading(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'block' : 'none';
    document.getElementById('submitBtn').disabled = show;
    document.getElementById('telegramBtn').disabled = show;
}

// ==================== SHOW MESSAGE ====================
function showMessage(message, type = 'error') {
    // Hapus pesan lama
    const oldMessage = document.querySelector('.error-message, .success-message');
    if (oldMessage) oldMessage.remove();
    
    // Buat pesan baru
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    messageDiv.textContent = message;
    
    // Insert di atas form
    const authCard = document.querySelector('.auth-card');
    authCard.insertBefore(messageDiv, document.querySelector('.auth-header').nextSibling);
    
    // Auto hide untuk success message
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

// ==================== HANDLE REGISTER ====================
async function handleRegister(formData) {
    try {
        // Ambil data Telegram dari sessionStorage jika ada
        const savedTelegramUser = sessionStorage.getItem('telegram_user');
        const telegramData = savedTelegramUser ? JSON.parse(savedTelegramUser) : telegramUser;
        
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: formData.username,
                email: formData.email,
                password: formData.password,
                telegram_data: telegramData // Kirim data Telegram
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Pendaftaran berhasil! Mengalihkan...', 'success');
            
            // Simpan session token
            if (data.session_token) {
                localStorage.setItem('session_token', data.session_token);
            }
            
            // Redirect ke dashboard setelah 1 detik
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            showMessage(data.message || 'Pendaftaran gagal');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Terjadi kesalahan. Silakan coba lagi.');
    }
}

// ==================== HANDLE LOGIN ====================
async function handleLogin(formData) {
    try {
        // Ambil data Telegram dari sessionStorage jika ada
        const savedTelegramUser = sessionStorage.getItem('telegram_user');
        const telegramData = savedTelegramUser ? JSON.parse(savedTelegramUser) : telegramUser;
        
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username_or_email: formData.username, // Bisa username atau email
                password: formData.password,
                telegram_data: telegramData // Kirim data Telegram
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Login berhasil! Mengalihkan...', 'success');
            
            // Simpan session token
            if (data.session_token) {
                localStorage.setItem('session_token', data.session_token);
            }
            
            // Redirect ke dashboard setelah 1 detik
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            showMessage(data.message || 'Login gagal');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Terjadi kesalahan. Silakan coba lagi.');
    }
}

// ==================== HANDLE FORM SUBMIT ====================
async function handleSubmit(e) {
    e.preventDefault();
    
    // Ambil nilai form
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    // Validasi
    const error = validateForm(username, email, password);
    if (error) {
        showMessage(error);
        return;
    }
    
    // Tampilkan loading
    showLoading(true);
    
    const formData = { username, email, password };
    
    if (currentMode === 'register') {
        await handleRegister(formData);
    } else {
        await handleLogin(formData);
    }
    
    // Sembunyikan loading
    showLoading(false);
}

// ==================== TOGGLE MODE ====================
function toggleMode() {
    currentMode = currentMode === 'login' ? 'register' : 'login';
    
    const formTitle = document.getElementById('formTitle');
    const formSubtitle = document.getElementById('formSubtitle');
    const submitBtn = document.getElementById('submitBtn');
    const toggleText = document.getElementById('toggleText');
    const toggleBtn = document.getElementById('toggleBtn');
    
    if (currentMode === 'register') {
        formTitle.textContent = 'Daftar';
        formSubtitle.textContent = 'Buat akun baru';
        submitBtn.textContent = 'Daftar';
        toggleText.textContent = 'Sudah punya akun?';
        toggleBtn.textContent = 'Login';
    } else {
        formTitle.textContent = 'Login';
        formSubtitle.textContent = 'Masuk ke akun Anda';
        submitBtn.textContent = 'Login';
        toggleText.textContent = 'Belum punya akun?';
        toggleBtn.textContent = 'Daftar';
    }
    
    // Reset form
    document.getElementById('authForm').reset();
    
    // Hapus pesan error
    const oldMessage = document.querySelector('.error-message, .success-message');
    if (oldMessage) oldMessage.remove();
}

// ==================== HANDLE TELEGRAM LOGIN ====================
async function handleTelegramLogin() {
    if (!telegramUser) {
        showMessage('Tidak dapat mengambil data Telegram. Pastikan Anda membuka app ini dari Telegram.');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/telegram-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegram_data: telegramUser
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.needs_registration) {
                // User belum terdaftar, arahkan ke mode register
                if (currentMode !== 'register') {
                    toggleMode();
                }
                
                // Isi form dengan data dari Telegram (optional)
                if (telegramUser.username) {
                    document.getElementById('username').value = telegramUser.username;
                }
                
                // Isi email dengan placeholder (user bisa mengganti)
                if (telegramUser.username) {
                    document.getElementById('email').value = `${telegramUser.username}@telegram.user`;
                }
                
                showMessage('Lengkapi data untuk mendaftar', 'success');
            } else {
                // Login sukses
                showMessage('Login dengan Telegram berhasil! Mengalihkan...', 'success');
                
                if (data.session_token) {
                    localStorage.setItem('session_token', data.session_token);
                }
                
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
            }
        } else {
            showMessage(data.message || 'Login Telegram gagal');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
        showLoading(false);
    }
}

// ==================== CEK SESSION ====================
async function checkSession() {
    const token = localStorage.getItem('session_token');
    if (!token) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_token: token
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Session valid, langsung redirect
            console.log('✅ Session valid, redirect ke dashboard');
            window.location.href = '/dashboard.html';
        } else {
            // Session tidak valid, hapus
            localStorage.removeItem('session_token');
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }
}

// ==================== INITIALIZATION ====================
function init() {
    console.log('🚀 App initialized');
    
    // Cek session
    checkSession();
    
    // Ambil data Telegram
    telegramUser = getTelegramUser();
    
    // Tampilkan kartu Telegram jika ada data
    if (telegramUser) {
        showTelegramCard(telegramUser);
    }
    
    // Event listeners
    document.getElementById('authForm').addEventListener('submit', handleSubmit);
    document.getElementById('toggleBtn').addEventListener('click', toggleMode);
    document.getElementById('telegramBtn').addEventListener('click', handleTelegramLogin);
}

// ==================== START ====================
document.addEventListener('DOMContentLoaded', init);
