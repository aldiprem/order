// State untuk profil
let userTransactions = [];
let userListings = [];

// Inisialisasi halaman profil
async function initProfile() {
    showLoading(true);

    // Update profile display
    updateProfileDisplay();

    // Load user data from API
    await loadUserData();

    // Load user's usernames
    await loadUserUsernames();

    showLoading(false);
}

// Update profile display
function updateProfileDisplay() {
    const profileAvatarImg = document.getElementById('profileAvatarImg');
    const profileAvatarText = document.getElementById('profileAvatarText');
    const profileName = document.getElementById('profileName');
    const profileUsername = document.getElementById('profileUsername');
    const profileBadge = document.getElementById('profileBadge');

    if (profileName) profileName.textContent = currentUser.firstName || 'Guest User';
    if (profileUsername) profileUsername.textContent = `@${currentUser.username}`;

    if (profileBadge) {
        profileBadge.textContent = currentUser.isAdmin ? '👑 Admin' : '👤 User';
        if (currentUser.isAdmin) {
            profileBadge.style.background = 'rgba(255, 215, 0, 0.2)';
            profileBadge.style.borderColor = 'rgba(255, 215, 0, 0.3)';
            profileBadge.style.color = '#ffd700';
        }
    }

    if (currentUser.photo && profileAvatarImg) {
        profileAvatarImg.src = currentUser.photo;
        profileAvatarImg.style.display = 'block';
        if (profileAvatarText) profileAvatarText.style.display = 'none';
    } else if (profileAvatarText) {
        profileAvatarText.textContent = (currentUser.firstName || 'G').charAt(0).toUpperCase();
        profileAvatarText.style.display = 'flex';
        if (profileAvatarImg) profileAvatarImg.style.display = 'none';
    }
}

// Load user data from API
async function loadUserData() {
    const userData = await apiRequest('user/me');

    if (userData) {
        // Update info details
        document.getElementById('infoUserId').textContent = userData.id || '-';

        if (userData.created_at) {
            const joinDate = new Date(userData.created_at);
            document.getElementById('infoJoinDate').textContent = joinDate.toLocaleDateString('id-ID');
        }

        if (userData.last_login) {
            const lastLogin = new Date(userData.last_login);
            document.getElementById('infoLastLogin').textContent = lastLogin.toLocaleDateString('id-ID');
        }

        document.getElementById('infoPremium').textContent = userData.is_premium ? 'Ya' : 'Tidak';
    }
}

// Load user's usernames from API
async function loadUserUsernames() {
    // This would need an API endpoint to get user's listings and transactions
    // For now, using mock data
    const mockUserUsernames = [
        { id: 1, name: 'Jennie', type: 'OP', price: 250, status: 'selling', date: '2024-01-15' },
        { id: 2, name: 'LisaS', type: 'SCANON', price: 180, status: 'sold', date: '2024-01-10' },
        { id: 3, name: 'Gojo', type: 'OP', price: 320, status: 'selling', date: '2024-01-05' },
        { id: 4, name: 'Mikay', type: 'OP', price: 140, status: 'bought', date: '2024-01-01' },
        { id: 5, name: 'Naruto', type: 'OP', price: 450, status: 'selling', date: '2024-01-20' },
        { id: 6, name: 'Claude', type: 'OP', price: 280, status: 'sold', date: '2024-01-18' },
    ];

    userListings = mockUserUsernames;

    // Update asset stats
    updateAssetStats(mockUserUsernames);

    // Render all usernames (no tabs)
    renderAllUsernames();
}

// Update asset statistics
function updateAssetStats(usernames) {
    const total = usernames.length;
    const sold = usernames.filter(u => u.status === 'sold').length;
    const bought = usernames.filter(u => u.status === 'bought').length;
    
    // Hitung total volume (contoh: total harga semua username)
    const totalVolume = usernames.reduce((sum, u) => sum + u.price, 0) * 15000; // Konversi ke Rupiah (contoh rate)
    
    // Format Rupiah
    const formatRupiah = (number) => {
        return 'Rp' + number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    document.getElementById('assetCount').textContent = total;
    document.getElementById('boughtSoldCount').textContent = `${bought}/${sold}`;
    document.getElementById('totalVolume').textContent = formatRupiah(totalVolume);
}

// Render all usernames (without tabs)
function renderAllUsernames() {
    const grid = document.getElementById('myUsernamesGrid');
    if (!grid) return;

    if (userListings.length === 0) {
        grid.innerHTML = '<div class="no-results">Belum ada username</div>';
        return;
    }

    // Sort by date (newest first)
    const sorted = [...userListings].sort((a, b) => new Date(b.date) - new Date(a.date));

    grid.innerHTML = sorted.map(item => `
        <div class="my-username-card">
            <div class="my-username-info">
                <div class="my-username-name">@${item.name}</div>
                <div class="my-username-meta">${item.type} • ${item.date}</div>
            </div>
            <div class="my-username-price">${item.price}</div>
            <div class="my-username-status status-${item.status}">
                ${item.status === 'selling' ? 'Dijual' : item.status === 'sold' ? 'Terjual' : 'Dibeli'}
            </div>
        </div>
    `).join('');
}

// Add username button handler
document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('addUsernameBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            // Redirect to add username page or open modal
            alert('Fitur tambah username akan segera hadir!');
        });
    }
});

// Initialize profile when DOM is loaded
if (window.location.pathname.includes('profil.html')) {
    document.addEventListener('DOMContentLoaded', async () => {
        await initTelegramUser();
        await initProfile();
    });
}
