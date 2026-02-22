// State untuk profil
let userTransactions = [];
let userListings = [];
let pendingOTP = null;
let otpTimer = null;

// ============= PROFILE INITIALIZATION =============

async function initProfile() {
    console.log('Initializing profile...');
    console.log('Current user from main.js:', currentUser);
    
    // Update profile display with data from main.js
    updateProfileDisplay();
    
    // Load user data from API
    await loadUserData();
    
    // Load user's usernames from API
    await loadUserUsernames();
    
    // Check for pending OTP session
    checkPendingOTP();
}

function updateProfileDisplay() {
    const profileAvatarImg = document.getElementById('profileAvatarImg');
    const profileAvatarText = document.getElementById('profileAvatarText');
    const profileName = document.getElementById('profileName');
    const profileUsername = document.getElementById('profileUsername');
    const profileBadge = document.getElementById('profileBadge');

    if (!currentUser) {
        console.error('currentUser is not defined!');
        return;
    }

    console.log('Updating profile with:', currentUser);

    if (profileName) {
        profileName.textContent = currentUser.firstName || 'Guest User';
    }
    
    if (profileUsername) {
        profileUsername.textContent = `@${currentUser.username}`;
    }

    if (profileBadge) {
        profileBadge.textContent = currentUser.isAdmin ? '👑 Admin' : '👤 User';
        if (currentUser.isAdmin) {
            profileBadge.style.background = 'rgba(255, 215, 0, 0.2)';
            profileBadge.style.borderColor = 'rgba(255, 215, 0, 0.3)';
            profileBadge.style.color = '#ffd700';
        } else {
            profileBadge.style.background = 'rgba(128, 128, 128, 0.2)';
            profileBadge.style.borderColor = 'rgba(128, 128, 128, 0.3)';
            profileBadge.style.color = '#e0e0e0';
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

async function loadUserData() {
    try {
        const userData = await apiRequest('user/me');
        
        if (userData && !userData.error) {
            document.getElementById('infoUserId').textContent = userData.id || '-';
            document.getElementById('infoJoinDate').textContent = userData.created_at ? new Date(userData.created_at).toLocaleDateString('id-ID') : '-';
            document.getElementById('infoLastLogin').textContent = userData.last_login ? new Date(userData.last_login).toLocaleDateString('id-ID') : '-';
            document.getElementById('infoPremium').textContent = userData.is_premium ? 'Ya' : 'Tidak';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load user's usernames from API
async function loadUserUsernames() {
    try {
        // Ganti dengan endpoint yang sesuai untuk mendapatkan username milik user
        // Ini contoh endpoint, sesuaikan dengan yang ada di backend
        const response = await apiRequest('user/usernames');
        
        if (response && Array.isArray(response)) {
            userListings = response;
        } else {
            // Jika endpoint belum ada, gunakan mock data sebagai fallback
            console.log('Using mock data for usernames');
            const mockUserUsernames = [
                { 
                    id: 1, 
                    name: 'Jennie', 
                    type: 'OP', 
                    category: 'idol', 
                    price: 250, 
                    status: 'selling', 
                    original: 'Jennie', 
                    desc: 'Blackpink',
                    date: '2024-01-15',
                    verified: true,
                    target_type: 'user'
                },
                { 
                    id: 2, 
                    name: 'LisaS', 
                    type: 'SCANON', 
                    category: 'idol', 
                    price: 180, 
                    status: 'sold', 
                    original: 'Lisa', 
                    desc: 'Blackpink + S',
                    date: '2024-01-10',
                    verified: true,
                    target_type: 'user'
                },
                { 
                    id: 3, 
                    name: 'Gojo', 
                    type: 'OP', 
                    category: 'anime', 
                    price: 320, 
                    status: 'selling', 
                    original: 'Gojo', 
                    desc: 'JJK',
                    date: '2024-01-05',
                    verified: true,
                    target_type: 'user'
                },
                { 
                    id: 4, 
                    name: 'Mikay', 
                    type: 'OP', 
                    category: 'game', 
                    price: 140, 
                    status: 'bought', 
                    original: 'Mikay', 
                    desc: 'Mobile Legends',
                    date: '2024-01-01',
                    verified: true,
                    target_type: 'user'
                },
                { 
                    id: 5, 
                    name: 'KpopChannel', 
                    type: 'CHANNEL', 
                    category: 'idol', 
                    price: 0, 
                    status: 'selling', 
                    original: 'KpopChannel', 
                    desc: 'Channel K-Pop',
                    date: '2024-01-20',
                    verified: true,
                    target_type: 'channel',
                    owner: '@channel_owner'
                },
                { 
                    id: 6, 
                    name: 'GameGroup', 
                    type: 'GROUP', 
                    category: 'game', 
                    price: 0, 
                    status: 'selling', 
                    original: 'GameGroup', 
                    desc: 'Grup Diskusi Game',
                    date: '2024-01-18',
                    verified: true,
                    target_type: 'group',
                    owner: '@group_owner'
                },
            ];
            userListings = mockUserUsernames;
        }
        
        // Update asset stats based on real data
        updateAssetStats(userListings);
        
        // Render usernames in grid
        renderUsernamesGrid(userListings);
        
    } catch (error) {
        console.error('Error loading user usernames:', error);
        // Show error in grid
        const grid = document.getElementById('myUsernamesGrid');
        if (grid) {
            grid.innerHTML = '<div class="no-results">Gagal memuat data username</div>';
        }
    }
}

// Update asset statistics based on user's usernames
function updateAssetStats(usernames) {
    const total = usernames.length;
    const sold = usernames.filter(u => u.status === 'sold').length;
    const bought = usernames.filter(u => u.status === 'bought').length;
    
    // Hitung total volume (total harga semua username)
    const totalVolume = usernames.reduce((sum, u) => sum + (u.price || 0), 0) * 15000;
    
    const formatRupiah = (number) => {
        return 'Rp' + number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };
    
    document.getElementById('assetCount').textContent = total;
    document.getElementById('boughtSoldCount').textContent = `${bought}/${sold}`;
    document.getElementById('totalVolume').textContent = formatRupiah(totalVolume);
}

// Render usernames in 2-column grid (like MARKET page)
function renderUsernamesGrid(usernames) {
    const grid = document.getElementById('myUsernamesGrid');
    if (!grid) return;
    
    if (usernames.length === 0) {
        grid.innerHTML = '<div class="no-results">Belum ada username</div>';
        return;
    }
    
    // Sort by date (newest first)
    const sorted = [...usernames].sort((a, b) => {
        if (a.date && b.date) {
            return new Date(b.date) - new Date(a.date);
        }
        return 0;
    });
    
    // Render grid with 2 columns
    grid.innerHTML = sorted.map(item => {
        // Determine status text and class
        let statusText = '';
        let statusClass = '';
        
        if (item.status === 'selling') {
            statusText = 'Dijual';
            statusClass = 'status-selling';
        } else if (item.status === 'sold') {
            statusText = 'Terjual';
            statusClass = 'status-sold';
        } else if (item.status === 'bought') {
            statusText = 'Dibeli';
            statusClass = 'status-bought';
        } else {
            statusText = item.status || 'Tersedia';
            statusClass = 'status-available';
        }
        
        // Determine type display
        let typeDisplay = item.type || 'CUSTOM';
        let categoryDisplay = item.category ? getCategoryName(item.category) : 'Lainnya';
        
        // Add target type indicator
        if (item.target_type) {
            if (item.target_type === 'channel') {
                typeDisplay = '📢 ' + typeDisplay;
            } else if (item.target_type === 'group') {
                typeDisplay = '👥 ' + typeDisplay;
            }
        }
        
        // Format price
        const priceDisplay = item.price ? `$${item.price}` : '-';
        
        return `
            <div class="username-card profile-username-card">
                <div class="username-name">@${item.name}</div>
                <div class="username-type">${typeDisplay}</div>
                <div class="username-category">${categoryDisplay} • ${item.desc || item.description || ''}</div>
                ${item.owner ? `<div class="username-owner">👑 Owner: ${item.owner}</div>` : ''}
                <div class="username-details">
                    <span class="username-price">${priceDisplay}</span>
                    <span class="username-status ${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Get category name
function getCategoryName(category) {
    const categories = {
        'idol': 'Idol K-Pop', 
        'mulchar': 'Multichar', 
        'anime': 'Anime',
        'game': 'Game', 
        'common': 'Common', 
        'uncommon': 'Uncommon'
    };
    return categories[category] || category;
}

// ============= ADD USERNAME FUNCTIONS =============

function extractUsername(input) {
    input = input.replace('@', '');
    const tmeMatch = input.match(/t\.me\/([a-zA-Z0-9_]+)/);
    if (tmeMatch) return tmeMatch[1];
    return input;
}

async function checkUsernameType(username) {
    try {
        const result = await apiRequest('username/check', 'POST', { username });
        return result;
    } catch (error) {
        console.error('Error checking username:', error);
        return {
            success: false,
            error: 'Network error'
        };
    }
}

async function sendOTP(target, type, targetId, targetTitle) {
    try {
        const result = await apiRequest('username/send-otp', 'POST', {
            username: target,
            type: type,
            target_id: targetId,
            title: targetTitle
        });
        
        if (result.success) {
            // Store OTP info locally
            pendingOTP = {
                target: target,
                type: type,
                targetId: targetId,
                targetTitle: targetTitle,
                timestamp: Date.now(),
                expiresIn: 300
            };
            localStorage.setItem('pendingOTP', JSON.stringify(pendingOTP));
            showMessageButton(true);
        }
        
        return result;
    } catch (error) {
        console.error('Error sending OTP:', error);
        return {
            success: false,
            message: 'Gagal mengirim OTP. Silakan coba lagi.'
        };
    }
}

async function verifyOTP(otp) {
    try {
        const result = await apiRequest('username/verify-otp', 'POST', { otp });
        return result;
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return {
            success: false,
            message: 'Gagal memverifikasi OTP.'
        };
    }
}

async function cancelVerification() {
    try {
        await apiRequest('username/cancel', 'POST', {});
    } catch (error) {
        console.error('Error canceling verification:', error);
    }
}

// Show/hide message button
function showMessageButton(show) {
    const btn = document.getElementById('messageButton');
    const badge = document.getElementById('messageBadge');
    
    if (btn) {
        btn.style.display = show ? 'flex' : 'none';
        if (show && pendingOTP) {
            badge.style.display = 'flex';
            btn.classList.add('has-message');
        } else {
            badge.style.display = 'none';
            btn.classList.remove('has-message');
        }
    }
}

// Check pending OTP session
function checkPendingOTP() {
    const saved = localStorage.getItem('pendingOTP');
    if (saved) {
        try {
            pendingOTP = JSON.parse(saved);
            const elapsed = (Date.now() - pendingOTP.timestamp) / 1000;
            
            if (elapsed < pendingOTP.expiresIn) {
                showMessageButton(true);
            } else {
                localStorage.removeItem('pendingOTP');
                pendingOTP = null;
            }
        } catch (e) {
            console.error('Error parsing pending OTP:', e);
        }
    }
}

// Start OTP timer
function startOTPTimer(expiresIn, timerElement) {
    if (otpTimer) clearInterval(otpTimer);
    
    const endTime = Date.now() + expiresIn * 1000;
    
    otpTimer = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        
        if (remaining <= 0) {
            clearInterval(otpTimer);
            timerElement.textContent = '0:00';
            
            if (pendingOTP) {
                localStorage.removeItem('pendingOTP');
                pendingOTP = null;
                showMessageButton(false);
            }
        } else {
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

// ============= MODAL FUNCTIONS =============

function showAddModal() {
    if (!currentUser || currentUser.id === 'guest') {
        alert('Silakan login dengan Telegram terlebih dahulu');
        return;
    }
    
    const modal = document.getElementById('addUsernameModal');
    if (!modal) return;
    
    modal.classList.add('show');
    document.getElementById('step1').style.display = 'block';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('targetUsername').value = '';
    document.getElementById('targetType').textContent = '-';
    document.getElementById('targetId').textContent = '-';
    document.getElementById('targetTitle').textContent = '-';
    document.getElementById('addStatusMessage').style.display = 'none';
    document.getElementById('confirmAddBtn').textContent = 'Lanjutkan';
    document.getElementById('confirmAddBtn').disabled = false;
}

function hideAddModal() {
    const modal = document.getElementById('addUsernameModal');
    if (modal) modal.classList.remove('show');
}

function showOtpModal() {
    if (!pendingOTP) return;
    
    const modal = document.getElementById('otpModal');
    if (!modal) return;
    
    modal.classList.add('show');
    document.getElementById('pendingOtpInput').value = '';
    document.getElementById('pendingTarget').textContent = pendingOTP.targetTitle || pendingOTP.target;
    document.getElementById('otpStatusMessage').style.display = 'none';
    
    startOTPTimer(pendingOTP.expiresIn - (Date.now() - pendingOTP.timestamp) / 1000, document.getElementById('pendingTimer'));
}

function hideOtpModal() {
    const modal = document.getElementById('otpModal');
    if (modal) modal.classList.remove('show');
    if (otpTimer) clearInterval(otpTimer);
}

// ============= EVENT LISTENERS =============

document.addEventListener('DOMContentLoaded', () => {
    console.log('Profil.js DOM loaded');
    
    // Tunggu sebentar untuk memastikan main.js sudah selesai
    setTimeout(() => {
        // Initialize profile
        initProfile();
    }, 500);
    
    // Add username button
    const addBtn = document.getElementById('addUsernameBtn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddModal);
    }
    
    // Message button
    const messageBtn = document.getElementById('messageButton');
    if (messageBtn) {
        messageBtn.addEventListener('click', showOtpModal);
    }
    
    // Close modals
    const closeAddModal = document.getElementById('closeAddModal');
    const closeOtpModal = document.getElementById('closeOtpModal');
    const cancelAddBtn = document.getElementById('cancelAddBtn');
    const cancelOtpBtn = document.getElementById('cancelOtpBtn');
    
    if (closeAddModal) closeAddModal.addEventListener('click', hideAddModal);
    if (closeOtpModal) closeOtpModal.addEventListener('click', hideOtpModal);
    if (cancelAddBtn) cancelAddBtn.addEventListener('click', hideAddModal);
    if (cancelOtpBtn) {
        cancelOtpBtn.addEventListener('click', () => {
            hideOtpModal();
            localStorage.removeItem('pendingOTP');
            pendingOTP = null;
            showMessageButton(false);
        });
    }
    
    // Target username input
    const targetInput = document.getElementById('targetUsername');
    if (targetInput) {
        let timeout;
        targetInput.addEventListener('input', async (e) => {
            clearTimeout(timeout);
            
            const value = e.target.value.trim();
            if (value.length < 3) {
                document.getElementById('targetType').textContent = '-';
                document.getElementById('targetId').textContent = '-';
                document.getElementById('targetTitle').textContent = '-';
                return;
            }
            
            timeout = setTimeout(async () => {
                const username = extractUsername(value);
                document.getElementById('targetType').textContent = 'Mengecek...';
                
                const result = await checkUsernameType(username);
                
                if (result && result.success) {
                    document.getElementById('targetType').textContent = result.type || 'unknown';
                    document.getElementById('targetId').textContent = result.id || '-';
                    document.getElementById('targetTitle').textContent = result.title || username;
                    
                    targetInput.dataset.type = result.type || 'unknown';
                    targetInput.dataset.id = result.id || '';
                    targetInput.dataset.title = result.title || username;
                    targetInput.dataset.canSend = result.can_send || false;
                } else {
                    document.getElementById('targetType').textContent = 'error';
                    document.getElementById('addStatusMessage').textContent = result?.error || 'Username tidak ditemukan';
                    document.getElementById('addStatusMessage').className = 'status-message error';
                    document.getElementById('addStatusMessage').style.display = 'block';
                }
            }, 500);
        });
    }
    
    // Confirm add button
    const confirmAddBtn = document.getElementById('confirmAddBtn');
    if (confirmAddBtn) {
        confirmAddBtn.addEventListener('click', async () => {
            const target = document.getElementById('targetUsername').value.trim();
            
            if (!target) {
                alert('Masukkan username target');
                return;
            }
            
            const username = extractUsername(target);
            const type = document.getElementById('targetType').textContent;
            const targetId = document.getElementById('targetId').textContent;
            const targetTitle = document.getElementById('targetTitle').textContent;
            
            if (type === '-' || type === 'Mengecek...' || type === 'error') {
                alert('Tunggu hingga pengecekan selesai');
                return;
            }
            
            confirmAddBtn.disabled = true;
            confirmAddBtn.innerHTML = '<span class="loading-spinner"></span> Mengirim...';
            
            const result = await sendOTP(username, type, targetId, targetTitle);
            
            if (result.success) {
                document.getElementById('step1').style.display = 'none';
                document.getElementById('step2').style.display = 'block';
                document.getElementById('otpTarget').textContent = targetTitle || username;
                
                startOTPTimer(300, document.getElementById('otpTimer'));
                
                confirmAddBtn.innerHTML = 'Verifikasi';
                
                // Update click handler for verification
                confirmAddBtn.onclick = async () => {
                    const otp = document.getElementById('otpInput').value;
                    
                    if (otp.length !== 6) {
                        document.getElementById('addStatusMessage').textContent = 'Masukkan 6 digit OTP';
                        document.getElementById('addStatusMessage').className = 'status-message error';
                        document.getElementById('addStatusMessage').style.display = 'block';
                        return;
                    }
                    
                    const verifyResult = await verifyOTP(otp);
                    
                    if (verifyResult.success) {
                        document.getElementById('addStatusMessage').textContent = '✅ Verifikasi berhasil! Username ditambahkan.';
                        document.getElementById('addStatusMessage').className = 'status-message success';
                        document.getElementById('addStatusMessage').style.display = 'block';
                        
                        localStorage.removeItem('pendingOTP');
                        pendingOTP = null;
                        showMessageButton(false);
                        
                        // Refresh username list
                        await loadUserUsernames();
                        
                        setTimeout(() => {
                            hideAddModal();
                        }, 2000);
                    } else {
                        document.getElementById('addStatusMessage').textContent = verifyResult.message || '❌ Kode OTP salah';
                        document.getElementById('addStatusMessage').className = 'status-message error';
                        document.getElementById('addStatusMessage').style.display = 'block';
                    }
                };
            } else {
                document.getElementById('addStatusMessage').textContent = result.message || 'Gagal mengirim OTP';
                document.getElementById('addStatusMessage').className = 'status-message error';
                document.getElementById('addStatusMessage').style.display = 'block';
                
                confirmAddBtn.disabled = false;
                confirmAddBtn.innerHTML = 'Lanjutkan';
            }
        });
    }
    
    // Verify OTP button in OTP modal
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', async () => {
            const otp = document.getElementById('pendingOtpInput').value;
            
            if (otp.length !== 6) {
                document.getElementById('otpStatusMessage').textContent = 'Masukkan 6 digit OTP';
                document.getElementById('otpStatusMessage').className = 'status-message error';
                document.getElementById('otpStatusMessage').style.display = 'block';
                return;
            }
            
            const result = await verifyOTP(otp);
            
            if (result.success) {
                document.getElementById('otpStatusMessage').textContent = '✅ Verifikasi berhasil!';
                document.getElementById('otpStatusMessage').className = 'status-message success';
                document.getElementById('otpStatusMessage').style.display = 'block';
                
                localStorage.removeItem('pendingOTP');
                pendingOTP = null;
                showMessageButton(false);
                
                // Refresh username list
                await loadUserUsernames();
                
                setTimeout(() => {
                    hideOtpModal();
                }, 2000);
            } else {
                document.getElementById('otpStatusMessage').textContent = result.message || '❌ Kode OTP salah';
                document.getElementById('otpStatusMessage').className = 'status-message error';
                document.getElementById('otpStatusMessage').style.display = 'block';
            }
        });
    }
});
