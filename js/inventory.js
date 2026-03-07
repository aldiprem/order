// js/inventory.js - Halaman Inventory INDOTAG MARKET

(function() {
    'use strict';

    console.log('📦 INVENTORY - Initializing...');

    // ==================== KONFIGURASI ====================
    const API_BASE_URL = window.CONFIG?.API_BASE_URL || 'https://steal-debate-semester-feature.trycloudflare.com';
    const MAX_RETRIES = 3;

    // ==================== STATE ====================
    let currentUser = null;
    let userUsernames = [];
    let isLoading = true;
    let keyboardHeight = 0;
    let activeEditModal = null;

    // ==================== DOM ELEMENTS ====================
    const elements = {
        inventoryPage: document.getElementById('inventoryPage'),
        contentWrapper: null
    };

    // ==================== UTILITY FUNCTIONS ====================
    function formatRupiah(angka) {
        if (!angka) return 'Rp 0';
        return 'Rp ' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function generateAvatarUrl(name, id) {
        if (!name) return `https://ui-avatars.com/api/?name=U&size=80&background=40a7e3&color=fff`;
        const firstChar = name.charAt(0).toUpperCase();
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstChar)}&size=80&background=40a7e3&color=fff`;
    }

    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(url, {
                ...options,
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }

            if (retries > 0) {
                console.log(`🔄 Retry... ${MAX_RETRIES - retries + 1}/${MAX_RETRIES}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return fetchWithRetry(url, options, retries - 1);
            }
            throw error;
        }
    }

    // ==================== TELEGRAM USER ====================
    function getCurrentUser() {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            return {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name || '',
                username: user.username,
                photo_url: user.photo_url
            };
        }
        
        const savedUser = localStorage.getItem('market_user');
        if (savedUser) {
            return JSON.parse(savedUser);
        }
        
        return {
            id: 7998861975,
            first_name: 'Al, Ways',
            last_name: '',
            username: 'demouser'
        };
    }

    // ==================== LOAD DATA ====================
    async function loadUserUsernames() {
        if (!currentUser) return [];

        try {
            const response = await fetchWithRetry(`${API_BASE_URL}/api/user-usernames/${currentUser.id}`, {
                method: 'GET'
            });

            return response || [];
        } catch (error) {
            console.error('Error loading user usernames:', error);
            return [];
        }
    }

    async function loadUsernameDetail(username) {
        try {
            const response = await fetchWithRetry(`${API_BASE_URL}/api/username/${username}`, {
                method: 'GET'
            });
            
            if (response.error) throw new Error(response.error);
            return response;
        } catch (error) {
            console.error('Error loading username detail:', error);
            return null;
        }
    }

    // ==================== UPDATE DATA ====================
    async function updateUsername(data) {
        try {
            // Update based_on
            if (data.based_on !== undefined) {
                await fetchWithRetry(`${API_BASE_URL}/api/update-based-on`, {
                    method: 'POST',
                    body: JSON.stringify({
                        username: data.username,
                        based_on: data.based_on
                    })
                });
            }

            // Update listed status
            if (data.listed_status !== undefined) {
                await fetchWithRetry(`${API_BASE_URL}/api/update-listed-status`, {
                    method: 'POST',
                    body: JSON.stringify({
                        username: data.username,
                        status: data.listed_status
                    })
                });
            }

            // Update kind (jenis)
            if (data.kind !== undefined) {
                await fetchWithRetry(`${API_BASE_URL}/api/update-kind`, {
                    method: 'POST',
                    body: JSON.stringify({
                        username: data.username,
                        kind: data.kind
                    })
                });
            }

            // Update price
            if (data.price !== undefined) {
                await fetchWithRetry(`${API_BASE_URL}/api/update-price`, {
                    method: 'POST',
                    body: JSON.stringify({
                        username: data.username,
                        price: data.price
                    })
                });
            }

            return true;
        } catch (error) {
            console.error('Error updating username:', error);
            return false;
        }
    }

    async function deleteUsername(username) {
        try {
            // Fungsi kosong - belum ada implementasi di backend
            console.log('Delete username:', username);
            return true;
        } catch (error) {
            console.error('Error deleting username:', error);
            return false;
        }
    }

    // ==================== RENDER FUNCTIONS ====================
    function renderLoadingSkeleton() {
        if (!elements.inventoryPage) return;
        
        let skeletonHtml = '<div class="content-wrapper">';
        
        // Profile skeleton
        skeletonHtml += `
            <div class="inventory-skeleton" style="height: 100px; margin-bottom: 20px;"></div>
            <div class="inventory-stats-grid">
                <div class="inventory-skeleton" style="height: 80px;"></div>
                <div class="inventory-skeleton" style="height: 80px;"></div>
                <div class="inventory-skeleton" style="height: 80px;"></div>
            </div>
            <div class="inventory-skeleton" style="height: 60px; margin-bottom: 20px;"></div>
            <div class="inventory-skeleton" style="height: 60px; margin-bottom: 20px;"></div>
        `;
        
        // Username skeletons
        for (let i = 0; i < 3; i++) {
            skeletonHtml += `
                <div class="inventory-skeleton" style="height: 80px; margin-bottom: 12px;"></div>
            `;
        }
        
        skeletonHtml += '</div>';
        elements.inventoryPage.innerHTML = skeletonHtml;
    }

    function renderInventory() {
        if (!elements.inventoryPage || !currentUser) return;

        const fullName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || 'User';
        const username = currentUser.username ? `@${currentUser.username}` : '@user';
        const avatarUrl = currentUser.photo_url || generateAvatarUrl(fullName, currentUser.id);

        const totalUsernames = userUsernames.length;
        const listedUsernames = userUsernames.filter(u => u.listed_status === 'listed').length;
        const totalValue = userUsernames.reduce((sum, u) => sum + (u.price || 0), 0);
        const listedValue = userUsernames
            .filter(u => u.listed_status === 'listed')
            .reduce((sum, u) => sum + (u.price || 0), 0);

        let usernamesHtml = '';

        if (userUsernames.length === 0) {
            usernamesHtml = `
                <div class="inventory-empty">
                    <i class="fas fa-tag"></i>
                    <h3>Belum Ada Username</h3>
                    <p>Klik tombol ADD USERNAME untuk menambahkan username pertama Anda</p>
                </div>
            `;
        } else {
            usernamesHtml = '<div class="inventory-usernames-list">';
            
            userUsernames.forEach(u => {
                const initial = u.username.charAt(0).toUpperCase();
                const shape = u.username_type || 'OP';
                const kind = u.kind || 'MULCHAR INDO';
                const basedOn = u.based_on || '-';
                const price = formatRupiah(u.price);
                const status = u.listed_status === 'listed' ? 'LISTED' : 'UNLISTED';
                const statusClass = u.listed_status === 'listed' ? 'listed' : 'unlisted';
                
                usernamesHtml += `
                    <div class="inventory-username-item" data-username="${u.username}">
                        <div class="inventory-username-header">
                            <div class="inventory-username-header-left">
                                <div class="inventory-username-avatar">${escapeHtml(initial)}</div>
                                <div class="inventory-username-large">@${escapeHtml(u.username)}</div>
                                <span class="inventory-username-badge ${statusClass}">${status}</span>
                            </div>
                            <div class="inventory-username-header-right">
                                <span class="inventory-header-price">${price}</span>
                                <div class="inventory-expand-icon">
                                    <i class="fas fa-chevron-down"></i>
                                </div>
                            </div>
                        </div>
                        <div class="inventory-username-content">
                            <div class="inventory-content-inner">
                                <div class="inventory-data-grid">
                                    <div class="inventory-data-item">
                                        <div class="inventory-data-label">
                                            <i class="fas fa-at"></i> BASED ON
                                        </div>
                                        <div class="inventory-data-value">${escapeHtml(basedOn)}</div>
                                    </div>
                                    <div class="inventory-data-item">
                                        <div class="inventory-data-label">
                                            <i class="fas fa-shapes"></i> BENTUK
                                        </div>
                                        <div class="inventory-data-value">${escapeHtml(shape)}</div>
                                    </div>
                                    <div class="inventory-data-item">
                                        <div class="inventory-data-label">
                                            <i class="fas fa-tag"></i> JENIS
                                        </div>
                                        <div class="inventory-data-value">${escapeHtml(kind)}</div>
                                    </div>
                                    <div class="inventory-data-item">
                                        <div class="inventory-data-label">
                                            <i class="fas fa-credit-card"></i> HARGA
                                        </div>
                                        <div class="inventory-data-value price">${price}</div>
                                    </div>
                                </div>
                                <div class="inventory-content-actions">
                                    <button class="inventory-content-btn edit" data-username="${u.username}">
                                        <i class="fas fa-pen"></i> EDIT USERNAME
                                    </button>
                                    <button class="inventory-content-btn delete" data-username="${u.username}">
                                        <i class="fas fa-trash"></i> DELETE
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            usernamesHtml += '</div>';
        }

        const totalValueFormatted = formatRupiah(totalValue);
        const listedValueFormatted = formatRupiah(listedValue);

        elements.inventoryPage.innerHTML = `
            <div class="content-wrapper">
                <!-- Profile Card -->
                <div class="inventory-profile-card">
                    <div class="inventory-profile-header">
                        <div class="inventory-avatar-large">
                            <img src="${avatarUrl}" alt="${escapeHtml(fullName)}">
                        </div>
                        <div class="inventory-info-large">
                            <div class="inventory-name-large">${escapeHtml(fullName)}</div>
                            <div class="inventory-username-large">
                                <i class="fas fa-at"></i> ${escapeHtml(username)}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="inventory-stats-grid">
                    <div class="inventory-stat-item">
                        <div class="inventory-stat-value">${totalUsernames}</div>
                        <div class="inventory-stat-label">TOTAL</div>
                    </div>
                    <div class="inventory-stat-item">
                        <div class="inventory-stat-value">${listedUsernames}</div>
                        <div class="inventory-stat-label">LISTED</div>
                    </div>
                    <div class="inventory-stat-item">
                        <div class="inventory-stat-value">${totalUsernames - listedUsernames}</div>
                        <div class="inventory-stat-label">UNLISTED</div>
                    </div>
                </div>

                <!-- Balance & Volume -->
                <div class="inventory-balance-card">
                    <div>
                        <div class="inventory-balance-label">SALDO</div>
                        <div class="inventory-balance-value">${totalValueFormatted}</div>
                    </div>
                    <div class="inventory-volume">
                        <div><span>${listedValueFormatted}</span> / ${totalValueFormatted}</div>
                    </div>
                </div>

                <!-- Add Username Button -->
                <button class="inventory-add-btn" id="inventoryAddUsernameBtn">
                    <i class="fas fa-plus-circle"></i> ADD USERNAME
                </button>

                <!-- Section Title -->
                <div class="inventory-section-title">
                    <i class="fas fa-tag"></i>
                    <h3>MY USERNAMES</h3>
                </div>

                <!-- Usernames List -->
                ${usernamesHtml}
            </div>
        `;

        // Add event listeners
        setupInventoryEventListeners();
    }

    function setupInventoryEventListeners() {
        // Toggle expand/collapse
        document.querySelectorAll('.inventory-username-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const item = header.closest('.inventory-username-item');
                if (item) {
                    item.classList.toggle('expanded');
                }
            });
        });

        // Edit buttons
        document.querySelectorAll('.inventory-content-btn.edit').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const username = btn.dataset.username;
                
                // Tampilkan loading di tombol
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> LOADING...';
                btn.disabled = true;
                
                // Load detail username
                const detail = await loadUsernameDetail(username);
                
                // Kembalikan tombol ke normal
                btn.innerHTML = originalText;
                btn.disabled = false;
                
                if (detail) {
                    showEditModal(detail);
                } else {
                    showToast('Gagal memuat detail username', 'error');
                }
            });
        });

        // Delete buttons
        document.querySelectorAll('.inventory-content-btn.delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const username = btn.dataset.username;
                
                if (confirm(`Hapus username @${username}?`)) {
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> DELETING...';
                    btn.disabled = true;
                    
                    const success = await deleteUsername(username);
                    
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    
                    if (success) {
                        showToast(`Username @${username} berhasil dihapus`, 'success');
                        // Refresh data
                        userUsernames = await loadUserUsernames();
                        renderInventory();
                    } else {
                        showToast('Gagal menghapus username', 'error');
                    }
                }
            });
        });

        // Add username button
        const addBtn = document.getElementById('inventoryAddUsernameBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                // Panggil fungsi dari script.js yang sudah ada
                if (typeof showAddUsernameModal === 'function') {
                    showAddUsernameModal();
                }
            });
        }
    }

    // ==================== EDIT MODAL ====================
    function showEditModal(data) {
        // Hapus modal lama jika ada
        const oldModal = document.getElementById('inventoryEditModal');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.id = 'inventoryEditModal';
        modal.className = 'inventory-edit-modal-overlay';

        const kinds = ['MULCHAR INDO', 'PREMIUM', 'VIP', 'STANDARD', 'GOLD'];

        modal.innerHTML = `
            <div class="inventory-edit-modal" id="inventoryEditModalContent">
                <div class="inventory-edit-modal-header">
                    <h3>EDIT USERNAME</h3>
                    <button class="inventory-edit-close" id="inventoryEditClose">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="inventory-edit-modal-content">
                    <div class="inventory-form-group">
                        <label class="inventory-form-label">
                            <i class="fas fa-at"></i> @${data.username}
                        </label>
                        <div style="background: rgba(0,0,0,0.3); padding: 12px 16px; border-radius: 16px; margin-bottom: 8px;">
                            <div style="color: var(--text-muted); font-size: 12px;">ID: ${data.id}</div>
                        </div>
                    </div>

                    <div class="inventory-form-group">
                        <label class="inventory-form-label">
                            <i class="fas fa-at"></i> BASED ON
                        </label>
                        <input type="text" class="inventory-form-input" id="editBasedOn" value="${escapeHtml(data.based_on || '')}" placeholder="Contoh: jkuda">
                    </div>

                    <div class="inventory-form-group">
                        <label class="inventory-form-label">
                            <i class="fas fa-check-circle"></i> STATUS
                        </label>
                        <div class="inventory-toggle-container" id="editStatusToggle">
                            <div class="inventory-toggle-option listed ${data.listed_status === 'listed' ? 'active' : ''}" data-status="listed">
                                <i class="fas fa-check-circle"></i> LISTED
                            </div>
                            <div class="inventory-toggle-option unlisted ${data.listed_status !== 'listed' ? 'active' : ''}" data-status="unlisted">
                                <i class="fas fa-times-circle"></i> UNLISTED
                            </div>
                        </div>
                    </div>

                    <div class="inventory-form-group">
                        <label class="inventory-form-label">
                            <i class="fas fa-tag"></i> JENIS
                        </label>
                        <div class="inventory-select-wrapper">
                            <select class="inventory-form-select" id="editKind">
                                ${kinds.map(k => `
                                    <option value="${k}" ${data.kind === k ? 'selected' : ''}>${k}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="inventory-form-group">
                        <label class="inventory-form-label">
                            <i class="fas fa-credit-card"></i> HARGA
                        </label>
                        <input type="number" class="inventory-form-input" id="editPrice" value="${data.price || 0}" min="0" placeholder="0">
                    </div>
                </div>
                <div class="inventory-edit-modal-footer">
                    <button class="inventory-modal-btn cancel" id="inventoryEditCancel">
                        <i class="fas fa-times"></i> BATAL
                    </button>
                    <button class="inventory-modal-btn save" id="inventoryEditSave">
                        <i class="fas fa-check"></i> SIMPAN
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Show modal
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        // Setup event listeners
        setupEditModalEvents(modal, data);
    }

    function setupEditModalEvents(modal, data) {
        const closeBtn = document.getElementById('inventoryEditClose');
        const cancelBtn = document.getElementById('inventoryEditCancel');
        const saveBtn = document.getElementById('inventoryEditSave');
        const modalContent = document.getElementById('inventoryEditModalContent');
        
        // Status toggle
        const listedOption = modal.querySelector('.inventory-toggle-option.listed');
        const unlistedOption = modal.querySelector('.inventory-toggle-option.unlisted');
        let currentStatus = data.listed_status || 'unlisted';

        listedOption.addEventListener('click', () => {
            listedOption.classList.add('active');
            unlistedOption.classList.remove('active');
            currentStatus = 'listed';
        });

        unlistedOption.addEventListener('click', () => {
            unlistedOption.classList.add('active');
            listedOption.classList.remove('active');
            currentStatus = 'unlisted';
        });

        // Close functions
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        // Click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Keyboard handling
        const inputFields = modal.querySelectorAll('input, select');
        
        inputFields.forEach(field => {
            field.addEventListener('focus', () => {
                activeEditModal = modalContent;
                modalContent.classList.add('keyboard-open');
                
                // Scroll to field
                setTimeout(() => {
                    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            });

            field.addEventListener('blur', () => {
                // Small delay to check if another field is focused
                setTimeout(() => {
                    const activeElement = document.activeElement;
                    const isInputFocused = activeElement && inputFields.includes(activeElement);
                    
                    if (!isInputFocused) {
                        modalContent.classList.remove('keyboard-open');
                        activeEditModal = null;
                    }
                }, 100);
            });
        });

        // Save function
        saveBtn.addEventListener('click', async () => {
            const basedOn = document.getElementById('editBasedOn').value.trim();
            const kind = document.getElementById('editKind').value;
            const price = parseInt(document.getElementById('editPrice').value) || 0;

            // Validasi
            if (!basedOn) {
                showToast('Based On harus diisi!', 'warning');
                return;
            }

            // Tampilkan loading
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MENYIMPAN...';
            saveBtn.disabled = true;

            // Update data
            const updateData = {
                username: data.username,
                based_on: basedOn,
                listed_status: currentStatus,
                kind: kind,
                price: price
            };

            const success = await updateUsername(updateData);

            if (success) {
                showToast('Username berhasil diperbarui!', 'success');
                closeModal();
                
                // Refresh data
                userUsernames = await loadUserUsernames();
                renderInventory();
            } else {
                showToast('Gagal memperbarui username', 'error');
            }

            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        });
    }

    // ==================== INITIALIZATION ====================
    async function initInventory() {
        console.log('📦 Initializing Inventory page...');

        // Get current user
        currentUser = getCurrentUser();

        // Show loading skeleton
        renderLoadingSkeleton();

        // Load data
        userUsernames = await loadUserUsernames();
        
        // Render
        renderInventory();
    }

    // Export function untuk dipanggil dari script.js
    window.initInventory = initInventory;
})();