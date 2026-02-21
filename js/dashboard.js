// ==================== KONFIGURASI ====================
const API_BASE_URL = 'https://individually-threaded-jokes-letting.trycloudflare.com';

// State
let currentUser = null;
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
    return null;
}

// ==================== CEK SESSION ====================
async function checkSession() {
    const token = localStorage.getItem('session_token');

    if (!token) {
        console.log('❌ Tidak ada session token');
        showUnauthorized('Anda belum login. Silakan login terlebih dahulu.');
        return false;
    }

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

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.user) {
            console.log('✅ Session valid:', data.user);
            currentUser = data.user;

            // Pastikan data user punya field yang diperlukan
            if (!currentUser.first_name) currentUser.first_name = currentUser.username || 'User';
            if (!currentUser.last_name) currentUser.last_name = '';

            return true;
        } else {
            console.log('❌ Session tidak valid');
            localStorage.removeItem('session_token');
            showUnauthorized('Session tidak valid. Silakan login ulang.');
            return false;
        }
    } catch (error) {
        console.error('Error checking session:', error);
        showUnauthorized('Gagal memverifikasi session. Periksa koneksi Anda.');
        return false;
    }
}

// ==================== TAMPILKAN UNAUTHORIZED ====================
function showUnauthorized(message = 'Anda belum memiliki akun. Silakan login atau daftar terlebih dahulu.') {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('unauthorizedScreen').style.display = 'flex';
    
    // Update pesan
    const messageEl = document.querySelector('#unauthorizedScreen p');
    if (messageEl) {
        messageEl.textContent = message;
    }
}

// ==================== LOAD DASHBOARD ====================
function loadDashboard() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'block';
    
    // Ambil data Telegram
    telegramUser = getTelegramUser();
    
    // Update UI dengan data user
    updateUserUI();
    
    // Generate avatar
    generateAvatar();
    
    // Load aktivitas
    loadRecentActivities();
}

// ==================== UPDATE UI DENGAN DATA USER ====================
function updateUserUI() {
    if (!currentUser) return;
    
    // Nama lengkap
    const fullName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || 
                     currentUser.username || 
                     'User';
    
    // Update welcome message
    document.getElementById('welcomeName').textContent = fullName.split(' ')[0];
    
    // Update user name di navbar
    document.getElementById('userName').textContent = fullName.length > 15 ? 
        fullName.substring(0, 12) + '...' : fullName;
    
    // Update detail akun
    document.getElementById('detailUserId').textContent = currentUser.id || '-';
    document.getElementById('detailTelegramId').textContent = currentUser.telegram_id || '-';
    document.getElementById('detailUsername').textContent = currentUser.username || '-';
    document.getElementById('detailEmail').textContent = currentUser.email || '-';
    document.getElementById('detailFullName').textContent = fullName;
    
    // Status premium
    const isPremium = currentUser.is_premium || false;
    const premiumBadge = isPremium ? 
        '<span style="background: #ffd700; color: #333; padding: 2px 8px; border-radius: 12px; font-size: 12px;">✅ PREMIUM</span>' : 
        '<span style="background: #e0e0e0; color: #666; padding: 2px 8px; border-radius: 12px; font-size: 12px;">⚫ REGULER</span>';
    document.getElementById('detailPremium').innerHTML = premiumBadge;
    
    // Bahasa
    document.getElementById('detailLanguage').textContent = 
        (currentUser.language_code || 'id').toUpperCase();
    
    // Tanggal bergabung
    const joinedDate = currentUser.created_at ? new Date(currentUser.created_at) : new Date();
    document.getElementById('detailJoined').textContent = formatDate(joinedDate);
    
    // Terakhir login
    const lastLogin = currentUser.last_login ? new Date(currentUser.last_login) : new Date();
    document.getElementById('detailLastLogin').textContent = formatDate(lastLogin, true);
    
    // Member since di banner
    document.getElementById('memberSince').innerHTML = `<i class="far fa-calendar-alt"></i> Member since ${formatDate(joinedDate, false, 'MMM YYYY')}`;
    
    // Stats (contoh)
    document.getElementById('totalFollowers').textContent = formatNumber(Math.floor(Math.random() * 5000) + 1000);
    document.getElementById('totalViews').textContent = formatNumber(Math.floor(Math.random() * 20000) + 5000);
    document.getElementById('userRank').textContent = '#' + (Math.floor(Math.random() * 100) + 1);
    document.getElementById('onlineTime').textContent = Math.floor(Math.random() * 24) + ' jam';
}

// ==================== GENERATE AVATAR ====================
function generateAvatar() {
    const avatarEl = document.getElementById('userAvatar');
    
    if (!currentUser) return;
    
    // Ambil inisial
    const firstName = currentUser.first_name || '';
    const lastName = currentUser.last_name || '';
    let initials = '';
    
    if (firstName && lastName) {
        initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    } else if (firstName) {
        initials = firstName.charAt(0).toUpperCase();
    } else if (currentUser.username) {
        initials = currentUser.username.charAt(0).toUpperCase();
    } else {
        initials = 'U';
    }
    
    // Batasi 2 karakter
    initials = initials.substring(0, 2);
    
    avatarEl.textContent = initials;
}

// ==================== FORMAT DATE ====================
function formatDate(date, withTime = false, format = 'DD MMM YYYY') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    if (withTime) {
        return `${day} ${month} ${year}, ${hours}:${minutes}`;
    }
    
    if (format === 'MMM YYYY') {
        return `${month} ${year}`;
    }
    
    return `${day} ${month} ${year}`;
}

// ==================== FORMAT NUMBER ====================
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// ==================== LOAD RECENT ACTIVITIES ====================
function loadRecentActivities() {
    const activities = [
        {
            icon: 'fas fa-sign-in-alt',
            iconColor: 'blue',
            title: 'Login dari perangkat baru',
            time: '2 menit yang lalu'
        },
        {
            icon: 'fas fa-user-edit',
            iconColor: 'green',
            title: 'Profil diperbarui',
            time: '1 jam yang lalu'
        },
        {
            icon: 'fas fa-share-alt',
            iconColor: 'orange',
            title: 'Konten dibagikan',
            time: '3 jam yang lalu'
        },
        {
            icon: 'fas fa-lock',
            iconColor: 'purple',
            title: 'Pengaturan keamanan diubah',
            time: '5 jam yang lalu'
        }
    ];
    
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = '';
    
    activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-icon ${activity.iconColor}">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-details">
                <p class="activity-title">${activity.title}</p>
                <p class="activity-time">${activity.time}</p>
            </div>
        `;
        activityList.appendChild(item);
    });
}

// ==================== HANDLE LOGOUT ====================
async function handleLogout() {
    const token = localStorage.getItem('session_token');
    
    if (token) {
        try {
            await fetch(`${API_BASE_URL}/api/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_token: token
                })
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    // Hapus session token
    localStorage.removeItem('session_token');
    
    // Redirect ke halaman login
    window.location.href = '/';
}

// ==================== TOGGLE SIDEBAR ====================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// ==================== INITIALIZATION ====================
async function init() {
    console.log('🚀 Dashboard initializing...');
    
    // Cek session
    const isValid = await checkSession();
    
    if (isValid) {
        // Load dashboard
        loadDashboard();
    }
    
    // Event listeners
    const backToLoginBtn = document.getElementById('backToLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const menuToggle = document.getElementById('menuToggle');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const userProfileBtn = document.getElementById('userProfileBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', () => {
            window.location.href = '/';
        });
    }
    
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);
    
    if (userProfileBtn) {
        userProfileBtn.addEventListener('click', () => {
            console.log('Profile clicked');
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            console.log('Search:', e.target.value);
        });
    }
}

// ==================== START ====================
document.addEventListener('DOMContentLoaded', init);
