// ==================== KONFIGURASI ====================
const API_BASE_URL = 'https://individually-threaded-jokes-letting.trycloudflare.com';

// State
let currentMode = 'login';
let telegramUser = null;

// ==================== AMBIL DATA TELEGRAM ====================
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

  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'U';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Pengguna Telegram';

  avatar.textContent = initials;
  nameEl.textContent = fullName;
  usernameEl.textContent = user.username ? `@${user.username}` : '(tanpa username)';
  premiumBadge.style.display = user.is_premium ? 'inline-block' : 'none';

  document.getElementById('telegramData').value = JSON.stringify(user);
  card.style.display = 'block';
}

// ==================== VALIDASI FORM ====================
function validateForm(username, email, password) {
  if (!username || username.length < 3) return 'Username minimal 3 karakter';
  if (!email || !email.includes('@') || !email.includes('.')) return 'Email tidak valid';
  if (!password || password.length < 6) return 'Password minimal 6 karakter';
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
  const oldMessage = document.querySelector('.error-message, .success-message');
  if (oldMessage) oldMessage.remove();

  const messageDiv = document.createElement('div');
  messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
  messageDiv.textContent = message;

  const authCard = document.querySelector('.auth-card');
  authCard.insertBefore(messageDiv, document.querySelector('.auth-header').nextSibling);

  if (type === 'success') {
    setTimeout(() => messageDiv.remove(), 3000);
  }
}

// ==================== HANDLE REGISTER ====================
async function handleRegister(formData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        telegram_data: telegramUser
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showMessage('Pendaftaran berhasil! Mengalihkan...', 'success');
      if (data.session_token) {
        localStorage.setItem('session_token', data.session_token);
        setTimeout(() => window.location.href = '/dashboard.html', 1000);
      }
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
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username_or_email: formData.username,
        password: formData.password,
        telegram_data: telegramUser
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showMessage('Login berhasil! Mengalihkan...', 'success');
      if (data.session_token) {
        localStorage.setItem('session_token', data.session_token);
        setTimeout(() => window.location.href = '/dashboard.html', 1000);
      }
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

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const error = validateForm(username, email, password);
  if (error) {
    showMessage(error);
    return;
  }

  showLoading(true);

  if (currentMode === 'register') {
    await handleRegister({ username, email, password });
  } else {
    await handleLogin({ username, email, password });
  }

  showLoading(false);
}

// ==================== TOGGLE MODE ====================
function toggleMode() {
  currentMode = currentMode === 'login' ? 'register' : 'login';

  document.getElementById('formTitle').textContent = currentMode === 'register' ? 'Daftar' : 'Login';
  document.getElementById('formSubtitle').textContent = currentMode === 'register' ? 'Buat akun baru' : 'Masuk ke akun Anda';
  document.getElementById('submitBtn').textContent = currentMode === 'register' ? 'Daftar' : 'Login';
  document.getElementById('toggleText').textContent = currentMode === 'register' ? 'Sudah punya akun?' : 'Belum punya akun?';
  document.getElementById('toggleBtn').textContent = currentMode === 'register' ? 'Login' : 'Daftar';

  document.getElementById('authForm').reset();

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_data: telegramUser })
    });

    const data = await response.json();

    if (response.ok) {
      if (data.needs_registration) {
        if (currentMode !== 'register') toggleMode();
        if (telegramUser.username) {
          document.getElementById('username').value = telegramUser.username;
          document.getElementById('email').value = `${telegramUser.username}@telegram.user`;
        }
        showMessage('Lengkapi data untuk mendaftar', 'success');
      } else {
        showMessage('Login dengan Telegram berhasil! Mengalihkan...', 'success');
        if (data.session_token) {
          localStorage.setItem('session_token', data.session_token);
          setTimeout(() => window.location.href = '/dashboard.html', 1000);
        }
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

// ==================== CEK SESSION (SEDERHANA) ====================
async function checkExistingSession() {
  const token = localStorage.getItem('session_token');
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: token })
    });

    const data = await response.json();

    if (data.success && data.user) {
      console.log('✅ Session valid, redirect ke dashboard');
      window.location.href = '/dashboard.html';
      return true;
    } else {
      localStorage.removeItem('session_token');
      return false;
    }
  } catch (error) {
    console.error('Error checking session:', error);
    return false;
  }
}

// ==================== INITIALIZATION ====================
async function init() {
  console.log('🚀 App initialized');

  // Cek session dulu
  const hasValidSession = await checkExistingSession();

  // Kalau tidak ada session valid, lanjut inisialisasi halaman login
  if (!hasValidSession) {
    telegramUser = getTelegramUser();
    if (telegramUser) showTelegramCard(telegramUser);

    document.getElementById('authForm').addEventListener('submit', handleSubmit);
    document.getElementById('toggleBtn').addEventListener('click', toggleMode);
    document.getElementById('telegramBtn').addEventListener('click', handleTelegramLogin);
  }
}

document.addEventListener('DOMContentLoaded', init);
