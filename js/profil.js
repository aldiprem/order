// State untuk profil
let userTransactions = [];
let userListings = [];
let pendingOTP = null;
let otpTimer = null;
let otpTarget = null;

// Inisialisasi halaman profil
async function initProfile() {
    showLoading(true);

    // Pastikan currentUser sudah terisi
    if (!currentUser || currentUser.id === 'guest') {
        console.log('Waiting for user data...');
        // Tunggu sebentar untuk user data
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('Current User:', currentUser);

    // Update profile display
    updateProfileDisplay();

    // Load user data from API
    await loadUserData();

    // Load user's usernames
    await loadUserUsernames();

    // Check for pending OTP session
    checkPendingOTP();

    showLoading(false);
}

// Update profile display
function updateProfileDisplay() {
    const profileAvatarImg = document.getElementById('profileAvatarImg');
    const profileAvatarText = document.getElementById('profileAvatarText');
    const profileName = document.getElementById('profileName');
    const profileUsername = document.getElementById('profileUsername');
    const profileBadge = document.getElementById('profileBadge');

    console.log('Updating profile with:', currentUser);

    if (profileName) profileName.textContent = currentUser.firstName || 'Guest User';
    if (profileUsername) profileUsername.textContent = `@${currentUser.username}`;

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

// Load user data from API
async function loadUserData() {
    try {
        const userData = await apiRequest('user/me');

        if (userData && !userData.error) {
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
    } catch (error) {
        console.error('Error loading user data:', error);
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
    updateAssetStats(mockUserUsernames);
    renderAllUsernames();
}

// Update asset statistics
function updateAssetStats(usernames) {
    const total = usernames.length;
    const sold = usernames.filter(u => u.status === 'sold').length;
    const bought = usernames.filter(u => u.status === 'bought').length;
    const totalVolume = usernames.reduce((sum, u) => sum + u.price, 0) * 15000;

    const formatRupiah = (number) => {
        return 'Rp' + number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    document.getElementById('assetCount').textContent = total;
    document.getElementById('boughtSoldCount').textContent = `${bought}/${sold}`;
    document.getElementById('totalVolume').textContent = formatRupiah(totalVolume);
}

// Render all usernames
function renderAllUsernames() {
    const grid = document.getElementById('myUsernamesGrid');
    if (!grid) return;

    if (userListings.length === 0) {
        grid.innerHTML = '<div class="no-results">Belum ada username</div>';
        return;
    }

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

// ============= ADD USERNAME FUNCTIONS =============

// Extract username from input
function extractUsername(input) {
    // Remove @ if present
    input = input.replace('@', '');
    
    // Extract from Telegram link
    const tmeMatch = input.match(/t\.me\/([a-zA-Z0-9_]+)/);
    if (tmeMatch) return tmeMatch[1];
    
    // Return as is
    return input;
}

// Check username type (user, channel, group)
async function checkUsernameType(username) {
    // Simulasi API call ke bot
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simulasi random type
            const types = ['user', 'channel', 'group'];
            const randomType = types[Math.floor(Math.random() * types.length)];
            
            resolve({
                success: true,
                type: randomType,
                id: Math.floor(Math.random() * 1000000000),
                title: username,
                canSend: randomType !== 'channel' || Math.random() > 0.3
            });
        }, 1500);
    });
}

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via bot
async function sendOTP(target, type, targetId, targetTitle) {
    const otp = generateOTP();
    
    // Simpan session OTP
    pendingOTP = {
        code: otp,
        target: target,
        type: type,
        targetId: targetId,
        targetTitle: targetTitle,
        timestamp: Date.now(),
        expiresIn: 300 // 5 menit
    };
    
    // Simpan ke localStorage
    localStorage.setItem('pendingOTP', JSON.stringify(pendingOTP));
    
    // Tampilkan message button
    showMessageButton(true);
    
    // Simulasi pengiriman OTP via bot
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simulasi sukses/gagal
            const success = Math.random() > 0.2; // 80% sukses
            
            if (success) {
                resolve({
                    success: true,
                    message: `Kode OTP ${otp} telah dikirim ke ${targetTitle || target}`
                });
            } else {
                resolve({
                    success: false,
                    message: type === 'channel' ? 
                        'Bot tidak dapat mengirim pesan ke channel. Pastikan bot sudah menjadi admin.' :
                        type === 'group' ?
                        'Bot tidak dapat mengirim pesan ke grup. Pastikan bot sudah ditambahkan.' :
                        'User belum pernah memulai bot. Minta user untuk /start bot terlebih dahulu.'
                });
            }
        }, 2000);
    });
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
                // OTP expired
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
            
            // Hapus session expired
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
    // Tunggu sebentar untuk memastikan main.js sudah load
    setTimeout(() => {
        console.log('Profil.js initialized');
        
        const addBtn = document.getElementById('addUsernameBtn');
        const messageBtn = document.getElementById('messageButton');
        const closeAddModal = document.getElementById('closeAddModal');
        const closeOtpModal = document.getElementById('closeOtpModal');
        const cancelAddBtn = document.getElementById('cancelAddBtn');
        const cancelOtpBtn = document.getElementById('cancelOtpBtn');
        const confirmAddBtn = document.getElementById('confirmAddBtn');
        const verifyOtpBtn = document.getElementById('verifyOtpBtn');
        const targetInput = document.getElementById('targetUsername');

        // Add username button
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (currentUser.id === 'guest') {
                    alert('Silakan login dengan Telegram terlebih dahulu');
                    return;
                }
                showAddModal();
            });
        }

        // Message button
        if (messageBtn) {
            messageBtn.addEventListener('click', () => {
                if (pendingOTP) {
                    showOtpModal();
                }
            });
        }

        // Close modals
        if (closeAddModal) {
            closeAddModal.addEventListener('click', hideAddModal);
        }
        
        if (closeOtpModal) {
            closeOtpModal.addEventListener('click', hideOtpModal);
        }
        
        if (cancelAddBtn) {
            cancelAddBtn.addEventListener('click', hideAddModal);
        }
        
        if (cancelOtpBtn) {
            cancelOtpBtn.addEventListener('click', () => {
                hideOtpModal();
                // Hapus session jika dibatalkan
                localStorage.removeItem('pendingOTP');
                pendingOTP = null;
                showMessageButton(false);
            });
        }

        // Target username input
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
                    
                    // Show loading
                    document.getElementById('targetType').textContent = 'Mengecek...';
                    
                    const result = await checkUsernameType(username);
                    
                    if (result.success) {
                        document.getElementById('targetType').textContent = result.type;
                        document.getElementById('targetId').textContent = result.id;
                        document.getElementById('targetTitle').textContent = result.title;
                        
                        // Store for later use
                        targetInput.dataset.type = result.type;
                        targetInput.dataset.id = result.id;
                        targetInput.dataset.title = result.title;
                        targetInput.dataset.canSend = result.canSend;
                    }
                }, 500);
            });
        }

        // Confirm add button
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
                
                if (type === '-' || type === 'Mengecek...') {
                    alert('Tunggu hingga pengecekan selesai');
                    return;
                }
                
                // Disable button, show loading
                confirmAddBtn.disabled = true;
                confirmAddBtn.innerHTML = '<span class="loading-spinner"></span> Mengirim...';
                
                // Send OTP
                const result = await sendOTP(username, type, targetId, targetTitle);
                
                if (result.success) {
                    // Show OTP step
                    document.getElementById('step1').style.display = 'none';
                    document.getElementById('step2').style.display = 'block';
                    document.getElementById('otpTarget').textContent = targetTitle || username;
                    
                    // Start timer
                    startOTPTimer(300, document.getElementById('otpTimer'));
                    
                    confirmAddBtn.innerHTML = 'Verifikasi';
                    
                    // Update click handler for verification
                    confirmAddBtn.onclick = () => {
                        const otp = document.getElementById('otpInput').value;
                        
                        if (otp.length !== 6) {
                            document.getElementById('addStatusMessage').textContent = 'Masukkan 6 digit OTP';
                            document.getElementById('addStatusMessage').className = 'status-message error';
                            document.getElementById('addStatusMessage').style.display = 'block';
                            return;
                        }
                        
                        if (pendingOTP && otp === pendingOTP.code) {
                            // OTP benar
                            document.getElementById('addStatusMessage').textContent = '✅ Verifikasi berhasil! Username ditambahkan.';
                            document.getElementById('addStatusMessage').className = 'status-message success';
                            document.getElementById('addStatusMessage').style.display = 'block';
                            
                            // Hapus session
                            localStorage.removeItem('pendingOTP');
                            pendingOTP = null;
                            showMessageButton(false);
                            
                            // Tutup modal setelah 2 detik
                            setTimeout(() => {
                                hideAddModal();
                            }, 2000);
                        } else {
                            document.getElementById('addStatusMessage').textContent = '❌ Kode OTP salah';
                            document.getElementById('addStatusMessage').className = 'status-message error';
                            document.getElementById('addStatusMessage').style.display = 'block';
                        }
                    };
                } else {
                    // Show error
                    document.getElementById('addStatusMessage').textContent = result.message;
                    document.getElementById('addStatusMessage').className = 'status-message error';
                    document.getElementById('addStatusMessage').style.display = 'block';
                    
                    confirmAddBtn.disabled = false;
                    confirmAddBtn.innerHTML = 'Lanjutkan';
                }
            });
        }

        // Verify OTP button in OTP modal
        if (verifyOtpBtn) {
            verifyOtpBtn.addEventListener('click', () => {
                const otp = document.getElementById('pendingOtpInput').value;
                
                if (otp.length !== 6) {
                    document.getElementById('otpStatusMessage').textContent = 'Masukkan 6 digit OTP';
                    document.getElementById('otpStatusMessage').className = 'status-message error';
                    document.getElementById('otpStatusMessage').style.display = 'block';
                    return;
                }
                
                if (pendingOTP && otp === pendingOTP.code) {
                    document.getElementById('otpStatusMessage').textContent = '✅ Verifikasi berhasil!';
                    document.getElementById('otpStatusMessage').className = 'status-message success';
                    document.getElementById('otpStatusMessage').style.display = 'block';
                    
                    // Hapus session
                    localStorage.removeItem('pendingOTP');
                    pendingOTP = null;
                    showMessageButton(false);
                    
                    // Tutup modal setelah 2 detik
                    setTimeout(() => {
                        hideOtpModal();
                    }, 2000);
                } else {
                    document.getElementById('otpStatusMessage').textContent = '❌ Kode OTP salah';
                    document.getElementById('otpStatusMessage').className = 'status-message error';
                    document.getElementById('otpStatusMessage').style.display = 'block';
                }
            });
        }
    }, 500); // Delay 500ms untuk memastikan main.js sudah load
});

// Initialize profile when DOM is loaded
if (window.location.pathname.includes('profil.html') || window.location.pathname.includes('/profil.html')) {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('Initializing profile...');
        
        // Tunggu sampai currentUser terisi dari main.js
        let attempts = 0;
        const maxAttempts = 10;
        
        while ((!currentUser || currentUser.id === 'guest') && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
            console.log(`Waiting for user data... attempt ${attempts}`);
        }
        
        console.log('Current user after wait:', currentUser);
        await initProfile();
    });
}
