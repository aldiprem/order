// js/inventory.js - Inventory Script Matched to Foto (Clean, Functional)

(function() {
    'use strict';

    console.log('📦 Initializing Inventory Page...');

    const API_BASE_URL = window.CONFIG?.API_BASE_URL || 'https://steal-debate-semester-feature.trycloudflare.com';

    let userData = null; // For profile header
    let userUsernames = [];

    const elements = {
        inventoryPage: document.getElementById('inventoryPage'),
        editModal: null,
        modalOverlay: null
    };

    async function initInventory() {
        if (!elements.inventoryPage) return;

        elements.inventoryPage.innerHTML = `
            <div class="inventory-container">
                <div class="inventory-profile" id="inventoryProfile"></div>
                <div class="add-username-container">
                    <button class="add-username-btn" id="addUsernameBtn">
                        <i class="fas fa-plus"></i> ADD USERNAME
                    </button>
                    <div class="icon-chart"><i class="fas fa-chart-bar"></i></div>
                    <div class="icon-money"><i class="fas fa-dollar-sign"></i></div>
                </div>
                <div class="my-usernames-title">
                    <i class="fas fa-envelope"></i> MY USERNAMES
                </div>
                <div class="usernames-grid" id="usernamesGrid"></div>
                <div class="empty-inventory" id="emptyInventory" style="display: none;">
                    Tidak ada username
                </div>
            </div>
        `;

        createEditModal();

        document.getElementById('addUsernameBtn').addEventListener('click', handleAddUsername);

        await loadData();
        setupEventListeners();
    }

    async function loadData() {
        try {
            // Load user profile (assume endpoint /api/user/info for header like foto)
            const userRes = await fetch(`${API_BASE_URL}/api/user/info`);
            userData = await userRes.json();
            renderProfile();

            // Load usernames
            const usernamesRes = await fetch(`${API_BASE_URL}/api/user/usernames`);
            userUsernames = await usernamesRes.json();
            renderGrid();
        } catch (error) {
            console.error('Load error:', error);
            showToast('Gagal memuat data', 'error');
        }
    }

    function renderProfile() {
        const profile = document.getElementById('inventoryProfile');
        profile.innerHTML = `
            <div class="profile-avatar">A <span class="profile-username">@${userData.username || 'ftamous'}</span></div>
            <div class="profile-id">${userData.id || '123456789'}</div>
            <div class="profile-stats">
                <div class="stat-item">
                    <div class="stat-label">Usernames</div>
                    <div class="stat-value">${userData.usernames || '9 / 10'}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Balance</div>
                    <div class="stat-value">Rp${userData.balance?.toLocaleString() || '100.000'}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Volume usernames</div>
                    <div class="stat-value">Rp${userData.volume?.toLocaleString() || '100.000 / Rp955.000'}</div>
                </div>
            </div>
        `;
    }

    function renderGrid() {
        const grid = document.getElementById('usernamesGrid');
        const empty = document.getElementById('emptyInventory');
        grid.innerHTML = '';

        if (userUsernames.length === 0) {
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';

        userUsernames.forEach((u, index) => {
            const card = document.createElement('div');
            card.className = 'username-card';
            card.innerHTML = `
                <div class="card-header ${index % 2 === 0 ? 'closed' : 'closed'}" data-username="${u.username}">
                    <span class="username-large">@${u.username}</span>
                    <div class="card-actions" style="display: none;">
                        <button class="action-btn edit-btn"><i class="fas fa-edit"></i> EDIT USERNAME</button>
                        <button class="action-btn delete-btn"><i class="fas fa-trash"></i> DELETE USERNAME</button>
                    </div>
                </div>
                <div class="card-details">
                    <table class="details-table">
                        <tr class="detail-row"><td class="detail-label">Based On</td><td class="detail-value">${u.based_on || ''}</td></tr>
                        <tr class="detail-row"><td class="detail-label">Status</td><td class="detail-value">${u.status || ''}</td></tr>
                        <tr class="detail-row"><td class="detail-label">Type</td><td class="detail-value">${u.type || ''}</td></tr>
                        <tr class="detail-row"><td class="detail-label">Bentuk</td><td class="detail-value">${u.shape || ''}</td></tr>
                        <tr class="detail-row"><td class="detail-label">Jenis</td><td class="detail-value">${u.kind || ''}</td></tr>
                        <tr class="detail-row"><td class="detail-label">Harga</td><td class="detail-value">${u.price ? 'Rp' + u.price.toLocaleString() : ''}</td></tr>
                        <tr class="detail-row"><td class="detail-label">Verifikasi</td><td class="detail-value">${u.verifikasi || ''}</td></tr>
                    </table>
                    <div class="card-graph">
                        <svg viewBox="0 0 100 20" preserveAspectRatio="none">
                            <path d="M0 10 Q25 0 50 10 Q75 20 100 10" class="graph-line"></path>
                        </svg>
                    </div>
                </div>
                <div class="card-loading" style="display: none;">
                    <div class="card-spinner"></div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    function setupEventListeners() {
        elements.inventoryPage.addEventListener('click', (e) => {
            const header = e.target.closest('.card-header');
            if (header) toggleCard(header);
            
            if (e.target.closest('.edit-btn')) handleEdit(e.target.closest('.card-header').dataset.username);
            if (e.target.closest('.delete-btn')) handleDelete(e.target.closest('.card-header').dataset.username);
        });

        document.getElementById('saveEdit').addEventListener('click', saveEdit);
        document.getElementById('cancelEdit').addEventListener('click', closeModal);
        elements.modalOverlay.addEventListener('click', closeModal);

        // Keyboard handling
        document.addEventListener('touchstart', (e) => {
            if (elements.editModal.classList.contains('show') && !elements.editModal.contains(e.target)) {
                document.activeElement.blur();
            }
        });

        let originalHeight = window.innerHeight;
        window.addEventListener('resize', () => {
            if (window.innerHeight < originalHeight) {
                elements.editModal.style.bottom = `${originalHeight - window.innerHeight + 30}px`;
            } else {
                elements.editModal.style.bottom = 'auto';
            }
        });
    }

    function toggleCard(header) {
        const details = header.nextElementSibling;
        const usernameSpan = header.querySelector('.username-large');
        const actions = header.querySelector('.card-actions');

        if (header.classList.contains('open')) {
            header.classList.remove('open');
            details.classList.remove('open');
            usernameSpan.style.display = 'block';
            actions.style.display = 'none';
        } else {
            header.classList.add('open');
            details.classList.add('open');
            usernameSpan.style.display = 'none';
            actions.style.display = 'flex';
        }
    }

    async function handleAddUsername() {
        const username = prompt('Masukkan username (tanpa @):');
        if (!username) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/add-username-request`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username})
            });
            if (!res.ok) throw new Error();
            showToast('Username ditambahkan', 'success');
            await loadData();
        } catch {
            showToast('Gagal tambah username', 'error');
        }
    }

    function handleEdit(username) {
        const data = userUsernames.find(u => u.username === username);
        if (!data) return;

        document.getElementById('editBasedOn').value = data.based_on || '';
        const toggle = document.getElementById('editStatusToggle');
        const checkbox = document.getElementById('editStatus');
        const label = document.getElementById('statusLabel');
        checkbox.checked = data.status === 'listed';
        toggle.classList.toggle('active', checkbox.checked);
        label.textContent = checkbox.checked ? 'Listed' : 'Unlisted';
        document.getElementById('editKind').value = data.kind || 'MULCHAR INDO';
        document.getElementById('editPrice').value = data.price || 0;

        elements.editModal.dataset.username = username;
        elements.editModal.classList.add('show');
        elements.modalOverlay.classList.add('show');
    }

    async function saveEdit() {
        const username = elements.editModal.dataset.username;
        const data = {
            based_on: document.getElementById('editBasedOn').value,
            status: document.getElementById('editStatus').checked ? 'listed' : 'unlisted',
            kind: document.getElementById('editKind').value,
            price: parseInt(document.getElementById('editPrice').value) || 0
        };

        try {
            await Promise.all([
                fetch(`${API_BASE_URL}/api/update-based-on`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username, based_on: data.based_on})}),
                fetch(`${API_BASE_URL}/api/update-listed-status`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username, status: data.status})}),
                fetch(`${API_BASE_URL}/api/update-kind`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username, kind: data.kind})}),
                fetch(`${API_BASE_URL}/api/update-price`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username, price: data.price})})
            ]);
            showToast('Update berhasil', 'success');
            closeModal();
            await loadData();
        } catch {
            showToast('Update gagal', 'error');
        }
    }

    function handleDelete(username) {
        if (!confirm('Hapus username ini?')) return;
        // Fungsi kosong (belum ada endpoint, bisa tambah nanti)
        showToast('Fungsi delete segera hadir', 'info');
    }

    function closeModal() {
        elements.editModal.classList.remove('show');
        elements.modalOverlay.classList.remove('show');
    }

    function createEditModal() {
        const modal = document.createElement('div');
        modal.className = 'edit-modal';
        modal.innerHTML = `
            <h2 class="edit-modal-title">EDIT USERNAME</h2>
            <form class="edit-form">
                <div class="form-group">
                    <label class="form-label">Based On</label>
                    <input type="text" id="editBasedOn" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Status</label>
                    <div class="toggle-switch">
                        <div id="editStatusToggle" class="toggle"></div>
                        <span class="toggle-label" id="statusLabel">Unlisted</span>
                    </div>
                    <input type="checkbox" id="editStatus" hidden>
                </div>
                <div class="form-group">
                    <label class="form-label">Jenis</label>
                    <select id="editKind" class="form-select">
                        <option value="MULCHAR INDO">MULCHAR INDO</option>
                        <!-- Tambah option lain jika perlu dari DB -->
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Harga</label>
                    <input type="number" id="editPrice" class="form-input" min="0">
                </div>
            </form>
            <div class="modal-actions">
                <button class="modal-btn save-btn" id="saveEdit"><i class="fas fa-save"></i> SIMPAN</button>
                <button class="modal-btn cancel-btn" id="cancelEdit"><i class="fas fa-times"></i> BATAL</button>
            </div>
        `;
        document.body.appendChild(modal);
        elements.editModal = modal;

        // Toggle logic
        const toggle = document.getElementById('editStatusToggle');
        const checkbox = document.getElementById('editStatus');
        const label = document.getElementById('statusLabel');
        toggle.addEventListener('click', () => {
            checkbox.checked = !checkbox.checked;
            toggle.classList.toggle('active');
            label.textContent = checkbox.checked ? 'Listed' : 'Unlisted';
        });

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
        elements.modalOverlay = overlay;
    }

    document.addEventListener('DOMContentLoaded', initInventory);
})();