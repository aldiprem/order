// ==================== KONFIGURASI ====================
const API_BASE_URL = 'https://individually-threaded-jokes-letting.trycloudflare.com';

let currentUser = null;

// ==================== CEK SESSION ====================
async function checkSession() {
    const token = localStorage.getItem('session_token');
    
    if (!token) {
        showUnauthorized('Anda belum login. Silakan login terlebih dahulu.');
        return false;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_token: token })
        });

        const data = await response.json();

        if (data.success && data.user) {
            console.log('✅ Session valid:', data.user);
            currentUser = data.user;
            return true;
        } else {
            localStorage.removeItem('session_token');
            showUnauthorized('Session tidak valid. Silakan login ulang.');
            return false;
        }
    } catch (error) {
        console.error('Error:', error);
        showUnauthorized('Gagal memverifikasi session. Periksa koneksi Anda.');
        return false;
    }
}

// ==================== TAMPILKAN UNAUTHORIZED ====================
function showUnauthorized(message) {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('unauthorizedScreen').style.display = 'flex';
    const messageEl = document.querySelector('#unauthorizedScreen p');
    if (messageEl) messageEl.textContent = message;
}

// ==================== LOAD DASHBOARD ====================
function loadDashboard() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'block';
    
    updateUserUI();
    generateAvatar();
    loadRecentActivities();
}

// ==================== UPDATE UI ====================
function updateUserUI() {
    if (!currentUser) return;
    
    const fullName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || 
                     currentUser.username || 'User';
    
    document.getElementById('welcomeName').textContent = fullName.split(' ')[0];
    document.getElementById('userName').textContent = fullName.length > 15 ? fullName.substring(0, 12) + '...' : fullName;
    
    document.getElementById('detailUserId').textContent = currentUser.id || '-';
    document.getElementById('detailTelegramId').textContent = currentUser.telegram_id || '-';
    document.getElementById('detailUsername').textContent = currentUser.username || '-';
    document.getElementById('detailEmail').textContent = currentUser.email || '-';
    document.getElementById('detailFullName').textContent = fullName;
    
    const isPremium = currentUser.is_premium || false;
    document.getElementById('detailPremium').innerHTML = isPremium ? 
        '<span style="background:#ffd700;color:#333;padding:2px 8px;border-radius:12px;">✅ PREMIUM</span>' : 
        '<span style="background:#e0e0e0;color:#666;padding:2px 8px;border-radius:12px;">⚫ REGULER</span>';
    
    document.getElementById('detailLanguage').textContent = (currentUser.language_code || 'id').toUpperCase();
    
    if (currentUser.created_at) {
        const joinedDate = new Date(currentUser.created_at);
        document.getElementById('detailJoined').textContent = formatDate(joinedDate);
        document.getElementById('memberSince').innerHTML = `<i class="far fa-calendar-alt"></i> Member since ${formatDate(joinedDate, false, 'MMM YYYY')}`;
    }
    
    if (currentUser.last_login) {
        document.getElementById('detailLastLogin').textContent = formatDate(new Date(currentUser.last_login), true);
    }
    
    // Stats dummy
    document.getElementById('totalFollowers').textContent = '1,234';
    document.getElementById('totalViews').textContent = '8,567';
    document.getElementById('userRank').textContent = '#42';
    document.getElementById('onlineTime').textContent = '12 jam';
}

// ==================== GENERATE AVATAR ====================
function generateAvatar() {
    if (!currentUser) return;
    
    const firstName = currentUser.first_name || '';
    const lastName = currentUser.last_name || '';
    let initials = 'U';
    
    if (firstName && lastName) initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    else if (firstName) initials = firstName.charAt(0).toUpperCase();
    else if (currentUser.username) initials = currentUser.username.charAt(0).toUpperCase();
    
    document.getElementById('userAvatar').textContent = initials.substring(0, 2);
}

// ==================== FORMAT DATE ====================
function formatDate(date, withTime = false, format = 'DD MMM YYYY') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    if (withTime) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day} ${month} ${year}, ${hours}:${minutes}`;
    }
    
    if (format === 'MMM YYYY') return `${month} ${year}`;
    return `${day} ${month} ${year}`;
}

// ==================== LOAD ACTIVITIES ====================
function loadRecentActivities() {
    const activities = [
        { icon: 'fas fa-sign-in-alt', color: 'blue', title: 'Login dari perangkat baru', time: '2 menit yang lalu' },
        { icon: 'fas fa-user-edit', color: 'green', title: 'Profil diperbarui', time: '1 jam yang lalu' },
        { icon: 'fas fa-share-alt', color: 'orange', title: 'Konten dibagikan', time: '3 jam yang lalu' }
    ];
    
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = '';
    
    activities.forEach(a => {
        activityList.innerHTML += `
            <div class="activity-item">
                <div class="activity-icon ${a.color}"><i class="${a.icon}"></i></div>
                <div class="activity-details">
                    <p class="activity-title">${a.title}</p>
                    <p class="activity-time">${a.time}</p>
                </div>
            </div>
        `;
    });
}

// ==================== HANDLE LOGOUT ====================
async function handleLogout() {
    const token = localStorage.getItem('session_token');
    if (token) {
        try {
            await fetch(`${API_BASE_URL}/api/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_token: token })
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    localStorage.removeItem('session_token');
    window.location.href = '/';
}

// ==================== TOGGLE SIDEBAR ====================
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

// ==================== INIT ====================
async function init() {
    console.log('🚀 Dashboard initializing...');
    
    const isValid = await checkSession();
    if (isValid) loadDashboard();
    
    document.getElementById('backToLoginBtn')?.addEventListener('click', () => window.location.href = '/');
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('menuToggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('closeSidebarBtn')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', toggleSidebar);
}

document.addEventListener('DOMContentLoaded', init);
