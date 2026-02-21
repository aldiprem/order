// ==================== KONFIGURASI ====================
const API_BASE_URL = 'https://covers-instructional-warehouse-samuel.trycloudflare.com';

const GOOGLE_CLIENT_ID = '511164982818-r096839s7vh55rbmc4uh8hbj6kqtkmg9.apps.googleusercontent.com';

// ==================== STATE MANAGEMENT ====================
// Session token
let sessionToken = localStorage.getItem('sessionToken');

// ==================== INISIALISASI ====================
window.onload = function() {
    // Cek session yang masih aktif
    if (sessionToken) {
        verifySession();
    }

    // Inisialisasi Google Identity Services
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse
        });
    }
};

// ==================== NOTIFIKASI ====================
function showNotification(title, message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    
    notification.className = 'notification ' + type;
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ==================== SWITCH MODE (LOGIN/REGISTER) ====================
function switchMode(mode) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginBtn = document.querySelectorAll('.toggle-btn')[0];
    const registerBtn = document.querySelectorAll('.toggle-btn')[1];
    
    if (mode === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        loginBtn.classList.add('active');
        registerBtn.classList.remove('active');
    } else {
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
        registerBtn.classList.add('active');
        loginBtn.classList.remove('active');
    }
}

// ==================== VALIDASI ====================
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
}

// ==================== PASSWORD STRENGTH ====================
function checkPasswordStrength() {
    const password = document.getElementById('regPassword').value;
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/) && password.match(/[^a-zA-Z0-9]/)) strength++;
    
    strengthBar.className = 'strength-bar';
    
    if (password.length === 0) {
        strengthBar.style.width = '0';
        strengthText.textContent = '';
    } else if (strength === 0 || strength === 1) {
        strengthBar.classList.add('weak');
        strengthText.textContent = 'Kekuatan: Lemah';
        strengthText.style.color = '#f44336';
    } else if (strength === 2) {
        strengthBar.classList.add('medium');
        strengthText.textContent = 'Kekuatan: Sedang';
        strengthText.style.color = '#ff9800';
    } else {
        strengthBar.classList.add('strong');
        strengthText.textContent = 'Kekuatan: Kuat';
        strengthText.style.color = '#4caf50';
    }
}

// ==================== HELPER FUNCTION ====================
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error parsing JWT:', error);
        return null;
    }
}

// ==================== SESSION MANAGEMENT ====================
async function verifySession() {
    if (!sessionToken) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/verify`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('Session valid:', data.user);
            // Simpan user data
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            
            // Redirect ke dashboard jika di halaman login
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
            }
        } else {
            // Session tidak valid, hapus token
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('currentUser');
            sessionToken = null;
        }
    } catch (error) {
        console.error('Session verification error:', error);
    }
}

// ==================== GOOGLE LOGIN ====================
function handleGoogleLogin() {
    if (typeof google === 'undefined') {
        showNotification('Error', 'Google API tidak dapat dimuat. Periksa koneksi internet Anda.', 'error');
        return;
    }
    
    if (!API_BASE_URL) {
        showNotification('Error', 'API URL belum dikonfigurasi', 'error');
        return;
    }
    
    // Memunculkan popup login Google
    google.accounts.id.prompt();
}

async function handleGoogleCredentialResponse(response) {
    try {
        // Decode JWT token dari Google
        const payload = parseJwt(response.credential);
        
        if (!payload) {
            showNotification('Error', 'Gagal memproses data Google', 'error');
            return;
        }
        
        showNotification('Info', 'Memproses login Google...', 'info');
        
        // Kirim ke backend
        const result = await fetch(`${API_BASE_URL}/api/google-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                google_id: payload.sub,
                email: payload.email,
                name: payload.name,
                picture: payload.picture
            })
        });
        
        const data = await result.json();
        
        if (result.ok) {
            // Simpan session token
            localStorage.setItem('sessionToken', data.session_token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            sessionToken = data.session_token;
            
            showNotification('Berhasil!', data.message, 'success');
            
            // Redirect setelah 1.5 detik
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);
        } else {
            showNotification('Gagal!', data.error || 'Terjadi kesalahan', 'error');
        }
    } catch (error) {
        console.error('Google login error:', error);
        showNotification('Error!', 'Gagal terhubung ke server', 'error');
    }
}

// ==================== MANUAL LOGIN ====================
async function handleLogin(event) {
    event.preventDefault();
    
    if (!API_BASE_URL) {
        showNotification('Error', 'API URL belum dikonfigurasi', 'error');
        return;
    }
    
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Reset error messages
    document.getElementById('loginIdentifierError').textContent = '';
    document.getElementById('loginPasswordError').textContent = '';
    document.getElementById('loginIdentifier').classList.remove('error');
    document.getElementById('loginPassword').classList.remove('error');
    
    // Validasi
    let isValid = true;
    
    if (!identifier) {
        document.getElementById('loginIdentifierError').textContent = 'Username atau email tidak boleh kosong';
        document.getElementById('loginIdentifier').classList.add('error');
        isValid = false;
    }
    
    if (!password) {
        document.getElementById('loginPasswordError').textContent = 'Password tidak boleh kosong';
        document.getElementById('loginPassword').classList.add('error');
        isValid = false;
    }
    
    if (!isValid) return;
    
    showNotification('Info', 'Memproses login...', 'info');
    
    try {
        // Kirim ke backend
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                identifier: identifier,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Simpan session token
            localStorage.setItem('sessionToken', data.session_token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            sessionToken = data.session_token;
            
            showNotification('Berhasil!', data.message, 'success');
            
            // Redirect setelah 1.5 detik
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);
        } else {
            showNotification('Gagal!', data.error || 'Username/email atau password salah', 'error');
            document.getElementById('loginPassword').classList.add('error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Error!', 'Gagal terhubung ke server. Periksa koneksi Anda.', 'error');
    }
}

// ==================== MANUAL REGISTER ====================
async function handleRegister(event) {
    event.preventDefault();
    
    if (!API_BASE_URL) {
        showNotification('Error', 'API URL belum dikonfigurasi', 'error');
        return;
    }
    
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    
    // Reset error messages
    document.getElementById('regUsernameError').textContent = '';
    document.getElementById('regEmailError').textContent = '';
    document.getElementById('regPasswordError').textContent = '';
    document.getElementById('regUsername').classList.remove('error');
    document.getElementById('regEmail').classList.remove('error');
    document.getElementById('regPassword').classList.remove('error');
    
    // Validasi
    let isValid = true;
    
    if (!username) {
        document.getElementById('regUsernameError').textContent = 'Username tidak boleh kosong';
        document.getElementById('regUsername').classList.add('error');
        isValid = false;
    } else if (!isValidUsername(username)) {
        document.getElementById('regUsernameError').textContent = 'Username hanya boleh huruf, angka, underscore (3-20 karakter)';
        document.getElementById('regUsername').classList.add('error');
        isValid = false;
    }
    
    if (!email) {
        document.getElementById('regEmailError').textContent = 'Email tidak boleh kosong';
        document.getElementById('regEmail').classList.add('error');
        isValid = false;
    } else if (!isValidEmail(email)) {
        document.getElementById('regEmailError').textContent = 'Format email tidak valid';
        document.getElementById('regEmail').classList.add('error');
        isValid = false;
    }
    
    if (!password) {
        document.getElementById('regPasswordError').textContent = 'Password tidak boleh kosong';
        document.getElementById('regPassword').classList.add('error');
        isValid = false;
    } else if (password.length < 8) {
        document.getElementById('regPasswordError').textContent = 'Password minimal 8 karakter';
        document.getElementById('regPassword').classList.add('error');
        isValid = false;
    }
    
    if (!isValid) return;
    
    showNotification('Info', 'Memproses registrasi...', 'info');
    
    try {
        // Kirim ke backend
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Simpan session token
            localStorage.setItem('sessionToken', data.session_token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            sessionToken = data.session_token;
            
            showNotification('Berhasil!', data.message, 'success');
            
            // Reset form
            document.getElementById('regUsername').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('strengthBar').style.width = '0';
            document.getElementById('strengthText').textContent = '';
            
            // Redirect setelah 1.5 detik
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);
        } else {
            showNotification('Gagal!', data.error || 'Terjadi kesalahan', 'error');
            
            // Tandai field yang bermasalah berdasarkan error
            if (data.error && data.error.includes('Username')) {
                document.getElementById('regUsername').classList.add('error');
            }
            if (data.error && data.error.includes('Email')) {
                document.getElementById('regEmail').classList.add('error');
            }
        }
    } catch (error) {
        console.error('Register error:', error);
        showNotification('Error!', 'Gagal terhubung ke server. Periksa koneksi Anda.', 'error');
    }
}

// ==================== LOGOUT ====================
async function logout() {
    if (!sessionToken) {
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('currentUser');
        window.location.href = '/index.html';
        return;
    }
    
    try {
        await fetch(`${API_BASE_URL}/api/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_token: sessionToken
            })
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Hapus session dari localStorage
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('currentUser');
        sessionToken = null;
        
        showNotification('Berhasil!', 'Anda telah logout', 'success');
        
        // Redirect ke halaman login
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1000);
    }
}

// ==================== CHECK AUTH STATUS (UNTUK HALAMAN LAIN) ====================
async function checkAuth() {
    if (!sessionToken) {
        window.location.href = '/index.html';
        return false;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/verify`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.user;
        } else {
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('currentUser');
            sessionToken = null;
            window.location.href = '/index.html';
            return false;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

// ==================== EXPOSE FUNCTIONS KE GLOBAL SCOPE ====================
// Fungsi-fungsi yang dipanggil dari HTML
window.switchMode = switchMode;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleGoogleLogin = handleGoogleLogin;
window.checkPasswordStrength = checkPasswordStrength;
window.logout = logout;
window.checkAuth = checkAuth;
