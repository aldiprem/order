// script.js - INDOTAG MARKET Main Script

(function() {
    'use strict';

    console.log('🚀 INDOTAG MARKET - Initializing...');

    // ==================== KONFIGURASI ====================
    const API_BASE_URL = window.CONFIG?.API_BASE_URL || 'https://steal-debate-semester-feature.trycloudflare.com';
    const MAX_RETRIES = 3;

    // ==================== STATE ====================
    let currentUser = null;
    let allUsernames = [];
    let filteredUsernames = [];
    let activities = [];
    let userUsernames = [];
    let activeFilterCount = 0;
    let currentPage = 'market';
    let isFilterPanelOpen = false;
    let lastScrollTop = 0;
    let scrollTimeout;

    // Filter state
    let filters = {
        search: '',
        type: 'all',
        minPrice: 0,
        maxPrice: 999999999,
        sortBy: 'latest'
    };

    // ==================== DOM ELEMENTS ====================
    const elements = {
        loadingOverlay: document.getElementById('loadingOverlay'),
        toastContainer: document.getElementById('toastContainer'),
        scrollTopBtn: document.getElementById('scrollTopBtn'),
        marketMain: document.getElementById('marketMain'),
        bottomNav: document.getElementById('bottomNav'),
        navIndicator: document.getElementById('navIndicator'),
        navItems: document.querySelectorAll('.nav-item'),
        pages: document.querySelectorAll('.page-content'),
        userProfileHeader: document.getElementById('userProfileHeader'),
        filterPanel: document.getElementById('filterPanel'),
        filterClose: document.getElementById('filterClose'),
        filterToggle: null, // Will be set dynamically
        filterBadge: null, // Will be set dynamically
        typeFilterChips: document.getElementById('typeFilterChips'),
        minPrice: document.getElementById('minPrice'),
        maxPrice: document.getElementById('maxPrice'),
        sortBy: document.getElementById('sortBy'),
        resetFilters: document.getElementById('resetFilters'),
        applyFilters: document.getElementById('applyFilters'),
        marketSearch: null // Will be set dynamically
    };

    // ==================== UTILITY FUNCTIONS ====================
    function showToast(message, type = 'info', duration = 3000) {
        if (!elements.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease reverse';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
    }

    function showLoading(show = true) {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }

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

    function formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffMinutes = Math.floor(diffTime / (1000 * 60));
            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffMinutes < 1) return 'Baru saja';
            if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
            if (diffHours < 24) return `${diffHours} jam lalu`;
            if (diffDays < 7) return `${diffDays} hari lalu`;

            return date.toLocaleDateString('id-ID', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }

    function generateAvatarUrl(name, id) {
        if (!name) return `https://ui-avatars.com/api/?name=U&size=80&background=40a7e3&color=fff`;
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name.charAt(0).toUpperCase())}&size=80&background=40a7e3&color=fff`;
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

    // ==================== TELEGRAM INTEGRATION ====================
    async function initTelegramUser() {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            currentUser = {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name || '',
                username: user.username,
                photo_url: user.photo_url
            };

            // Save to localStorage
            localStorage.setItem('market_user', JSON.stringify(currentUser));

            // Verify user with backend
            try {
                await fetchWithRetry(`${API_BASE_URL}/api/verify-user`, {
                    method: 'POST',
                    body: JSON.stringify(currentUser)
                });
            } catch (error) {
                console.warn('Failed to verify user:', error);
            }

            return currentUser;
        }

        // Try to load from localStorage
        const savedUser = localStorage.getItem('market_user');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            return currentUser;
        }

        // Fallback demo user
        currentUser = {
            id: 123456789,
            first_name: 'Demo',
            last_name: 'User',
            username: 'demouser'
        };
        return currentUser;
    }

    function renderUserProfile() {
        if (!elements.userProfileHeader || !currentUser) return;

        const fullName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || 'User';
        const username = currentUser.username ? `@${currentUser.username}` : '@user';
        const avatarUrl = currentUser.photo_url || generateAvatarUrl(fullName, currentUser.id);

        elements.userProfileHeader.innerHTML = `
            <div class="user-profile-card">
                <div class="user-info">
                    <div class="user-fullname">${escapeHtml(fullName)}</div>
                    <div class="user-username">${escapeHtml(username)}</div>
                </div>
                <div class="user-avatar">
                    <img src="${avatarUrl}" alt="${escapeHtml(fullName)}">
                </div>
            </div>
        `;
    }

    // ==================== DATA LOADING ====================
    async function loadMarketData() {
        showLoading(true);

        try {
            // Load listed usernames
            const usernames = await fetchWithRetry(`${API_BASE_URL}/api/market`, {
                method: 'GET'
            });

            allUsernames = usernames || [];
            
            // Determine username type for each
            allUsernames.forEach(u => {
                u.username_type = determineUsernameType(u.username, u.based_on);
            });

            applyFilters();
        } catch (error) {
            console.error('Error loading market data:', error);
            showToast('Gagal memuat data market', 'error');
            allUsernames = [];
        } finally {
            showLoading(false);
        }
    }

    async function loadActivities() {
        try {
            // For now, use mock data since activity endpoint might not exist
            // In production, replace with actual API call
            activities = [];
            
            // Try to load from API if available
            try {
                const response = await fetchWithRetry(`${API_BASE_URL}/api/activity/all`, {
                    method: 'GET'
                });
                if (response && Array.isArray(response)) {
                    activities = response;
                }
            } catch (error) {
                console.log('Activity endpoint not available, using mock data');
            }

            renderActivities();
        } catch (error) {
            console.error('Error loading activities:', error);
        }
    }

    async function loadUserUsernames() {
        if (!currentUser) return;

        try {
            const response = await fetchWithRetry(`${API_BASE_URL}/api/user-usernames/${currentUser.id}`, {
                method: 'GET'
            });

            userUsernames = response || [];
            renderProfile();
        } catch (error) {
            console.error('Error loading user usernames:', error);
            userUsernames = [];
        }
    }

    function determineUsernameType(username, basedOn) {
        if (!basedOn) return 'UNCOMMON';

        const usernameLower = username.toLowerCase();
        const basedOnLower = basedOn.toLowerCase();

        // Check for OP (exact match)
        if (usernameLower === basedOnLower) return 'OP';

        // Check for SCANON (adds 's' at end)
        if (usernameLower === basedOnLower + 's') return 'SCANON';

        // Check for SOP (double letters)
        for (let i = 0; i < basedOnLower.length - 1; i++) {
            if (basedOnLower[i] === basedOnLower[i + 1]) {
                if (usernameLower === basedOnLower.slice(0, i + 1) + basedOnLower.slice(i + 1)) {
                    return 'SOP';
                }
            }
        }

        // Check for CANON (i to l or l to i)
        let canonPossible = true;
        if (usernameLower.length === basedOnLower.length) {
            for (let i = 0; i < usernameLower.length; i++) {
                const a = usernameLower[i];
                const b = basedOnLower[i];
                if ((a === 'l' && b === 'i') || (a === 'i' && b === 'l')) continue;
                if (a !== b) {
                    canonPossible = false;
                    break;
                }
            }
            if (canonPossible) return 'CANON';
        }

        // Check for TAMPING (add letter at beginning or end)
        if (usernameLower.length === basedOnLower.length + 1) {
            if (usernameLower.startsWith(basedOnLower) || usernameLower.endsWith(basedOnLower)) {
                return 'TAMPING';
            }
        }

        // Check for TAMDAL (add letter in middle)
        if (usernameLower.length === basedOnLower.length + 1) {
            for (let i = 0; i < basedOnLower.length; i++) {
                if (usernameLower.startsWith(basedOnLower.slice(0, i)) && 
                    usernameLower.slice(i + 1).startsWith(basedOnLower.slice(i))) {
                    return 'TAMDAL';
                }
            }
        }

        // Check for GANHUR (replace one letter)
        if (usernameLower.length === basedOnLower.length) {
            let diffCount = 0;
            for (let i = 0; i < usernameLower.length; i++) {
                if (usernameLower[i] !== basedOnLower[i]) diffCount++;
            }
            if (diffCount === 1) return 'GANHUR';
        }

        // Check for SWITCH (swap adjacent letters)
        if (usernameLower.length === basedOnLower.length) {
            for (let i = 0; i < basedOnLower.length - 1; i++) {
                const switched = basedOnLower.slice(0, i) + basedOnLower[i + 1] + basedOnLower[i] + basedOnLower.slice(i + 2);
                if (switched === usernameLower) return 'SWITCH';
            }
        }

        // Check for KURHUF (remove one letter)
        if (usernameLower.length === basedOnLower.length - 1) {
            for (let i = 0; i < basedOnLower.length; i++) {
                if (usernameLower === basedOnLower.slice(0, i) + basedOnLower.slice(i + 1)) {
                    return 'KURHUF';
                }
            }
        }

        return 'UNCOMMON';
    }

    // ==================== FILTER FUNCTIONS ====================
    function applyFilters() {
        let filtered = [...allUsernames];

        // Apply search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(u => 
                u.username.toLowerCase().includes(searchLower) ||
                (u.based_on && u.based_on.toLowerCase().includes(searchLower))
            );
        }

        // Apply type filter
        if (filters.type !== 'all') {
            filtered = filtered.filter(u => u.username_type === filters.type);
        }

        // Apply price range
        filtered = filtered.filter(u => 
            (u.price || 0) >= filters.minPrice && 
            (u.price || 0) <= filters.maxPrice
        );

        // Apply sorting
        switch (filters.sortBy) {
            case 'price_low':
                filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
                break;
            case 'price_high':
                filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
                break;
            case 'char_asc':
                filtered.sort((a, b) => (a.based_on?.length || 0) - (b.based_on?.length || 0));
                break;
            case 'char_desc':
                filtered.sort((a, b) => (b.based_on?.length || 0) - (a.based_on?.length || 0));
                break;
            case 'alpha_asc':
                filtered.sort((a, b) => (a.based_on || '').localeCompare(b.based_on || ''));
                break;
            case 'alpha_desc':
                filtered.sort((a, b) => (b.based_on || '').localeCompare(a.based_on || ''));
                break;
            case 'latest':
            default:
                filtered.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
                break;
        }

        filteredUsernames = filtered;
        renderMarket();
        updateFilterBadge();
    }

    function updateFilterBadge() {
        const count = 
            (filters.type !== 'all' ? 1 : 0) +
            (filters.minPrice > 0 ? 1 : 0) +
            (filters.maxPrice < 999999999 ? 1 : 0) +
            (filters.sortBy !== 'latest' ? 1 : 0) +
            (filters.search ? 1 : 0);

        activeFilterCount = count;

        if (elements.filterBadge) {
            if (count > 0) {
                elements.filterBadge.textContent = count;
                elements.filterBadge.style.display = 'flex';
            } else {
                elements.filterBadge.style.display = 'none';
            }
        }
    }

    function resetFilters() {
        filters = {
            search: '',
            type: 'all',
            minPrice: 0,
            maxPrice: 999999999,
            sortBy: 'latest'
        };

        // Update UI
        if (elements.marketSearch) elements.marketSearch.value = '';
        
        // Update chips
        document.querySelectorAll('.chip[data-type]').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.type === 'all');
        });

        if (elements.minPrice) elements.minPrice.value = 0;
        if (elements.maxPrice) elements.maxPrice.value = 999999999;
        if (elements.sortBy) elements.sortBy.value = 'latest';

        applyFilters();
    }

    // ==================== RENDER FUNCTIONS ====================
    function renderMarket() {
        const marketPage = document.getElementById('marketPage');
        if (!marketPage) return;

        // Create header with search and filter
        const headerHtml = `
            <div class="market-header-actions">
                <div class="market-search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" id="marketSearchInput" placeholder="Cari username atau based on..." value="${escapeHtml(filters.search)}">
                </div>
                <button class="filter-toggle-btn" id="filterToggleBtn">
                    <i class="fas fa-sliders-h"></i>
                    <span class="filter-badge" id="filterBadge" style="display: ${activeFilterCount > 0 ? 'flex' : 'none'};">${activeFilterCount}</span>
                </button>
            </div>
        `;

        // Create username grid
        let gridHtml = '<div class="username-grid">';

        if (filteredUsernames.length === 0) {
            gridHtml = `
                <div class="empty-market">
                    <i class="fas fa-tag"></i>
                    <h3>Tidak Ada Username</h3>
                    <p>${allUsernames.length === 0 ? 'Memuat data...' : 'Tidak ada username yang cocok dengan filter'}</p>
                </div>
            `;
        } else {
            filteredUsernames.forEach(username => {
                const template = document.getElementById('marketUsernameTemplate');
                const clone = document.importNode(template.content, true);

                clone.querySelector('.username').textContent = username.username;
                clone.querySelector('.username-type-badge').textContent = username.username_type;
                clone.querySelector('.based-on-value').textContent = username.based_on || '-';
                clone.querySelector('.price-value').textContent = formatRupiah(username.price);

                // Add to grid
                const div = document.createElement('div');
                div.appendChild(clone);
                gridHtml += div.innerHTML;
            });
            gridHtml += '</div>';
        }

        marketPage.innerHTML = headerHtml + gridHtml;

        // Re-attach event listeners
        elements.marketSearch = document.getElementById('marketSearchInput');
        elements.filterToggle = document.getElementById('filterToggleBtn');
        elements.filterBadge = document.getElementById('filterBadge');

        if (elements.marketSearch) {
            elements.marketSearch.addEventListener('input', (e) => {
                filters.search = e.target.value;
                applyFilters();
            });
        }

        if (elements.filterToggle) {
            elements.filterToggle.addEventListener('click', toggleFilterPanel);
        }
    }

    function renderActivities() {
        const activityPage = document.getElementById('activityPage');
        if (!activityPage) return;

        if (activities.length === 0) {
            // Show empty state with some mock activities for demo
            activityPage.innerHTML = `
                <div class="empty-market">
                    <i class="fas fa-history"></i>
                    <h3>Belum Ada Aktivitas</h3>
                    <p>Aktivitas akan muncul di sini</p>
                </div>
            `;
            return;
        }

        let html = '<div class="activity-list">';

        activities.forEach(activity => {
            const template = document.getElementById('activityItemTemplate');
            const clone = document.importNode(template.content, true);

            // Set icon based on action
            let icon = 'fas fa-info-circle';
            if (activity.action?.includes('LISTED')) icon = 'fas fa-tag';
            else if (activity.action?.includes('PRICE')) icon = 'fas fa-credit-card';
            else if (activity.action?.includes('BASED_ON')) icon = 'fas fa-pencil-alt';
            else if (activity.action?.includes('ADDED')) icon = 'fas fa-plus-circle';

            clone.querySelector('.activity-icon i').className = icon;
            clone.querySelector('.activity-title').textContent = activity.details || 'Aktivitas baru';
            clone.querySelector('.activity-username').textContent = activity.username ? `@${activity.username}` : '';
            clone.querySelector('.activity-time').textContent = formatDate(activity.created_at);

            const div = document.createElement('div');
            div.appendChild(clone);
            html += div.innerHTML;
        });

        html += '</div>';
        activityPage.innerHTML = html;
    }

    function renderProfile() {
        const profilePage = document.getElementById('profilePage');
        if (!profilePage || !currentUser) return;

        const fullName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || 'User';
        const username = currentUser.username ? `@${currentUser.username}` : '@user';
        const avatarUrl = currentUser.photo_url || generateAvatarUrl(fullName, currentUser.id);

        let usernamesHtml = '';
        if (userUsernames.length === 0) {
            usernamesHtml = `
                <div class="empty-market" style="margin-top: 16px;">
                    <i class="fas fa-tag"></i>
                    <p>Belum ada username tersimpan</p>
                </div>
            `;
        } else {
            usernamesHtml = '<div class="profile-usernames-list">';
            userUsernames.forEach(u => {
                const template = document.getElementById('profileUsernameTemplate');
                const clone = document.importNode(template.content, true);

                clone.querySelector('.profile-username-name').textContent = u.username;
                clone.querySelector('.profile-username-type').textContent = u.listed_status === 'listed' ? 'LISTED' : 'UNLISTED';
                clone.querySelector('.profile-username-price').textContent = formatRupiah(u.price);

                const div = document.createElement('div');
                div.appendChild(clone);
                usernamesHtml += div.innerHTML;
            });
            usernamesHtml += '</div>';
        }

        profilePage.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <div class="profile-avatar-large">
                        <img src="${avatarUrl}" alt="${escapeHtml(fullName)}">
                    </div>
                    <div class="profile-info-large">
                        <div class="profile-name-large">${escapeHtml(fullName)}</div>
                        <div class="profile-username-large">
                            <i class="fas fa-at"></i>
                            ${escapeHtml(username)}
                        </div>
                    </div>
                </div>
                <div class="profile-stats-large">
                    <div class="profile-stat-item">
                        <div class="profile-stat-value">${userUsernames.length}</div>
                        <div class="profile-stat-label">Username</div>
                    </div>
                    <div class="profile-stat-item">
                        <div class="profile-stat-value">${userUsernames.filter(u => u.listed_status === 'listed').length}</div>
                        <div class="profile-stat-label">Listed</div>
                    </div>
                </div>
            </div>

            <div class="profile-section-title">
                <i class="fas fa-tag"></i>
                <h3>Username Saya</h3>
            </div>

            ${usernamesHtml}
        `;
    }

    function renderGames() {
        const gamesPage = document.getElementById('gamesPage');
        if (!gamesPage) return;

        const template = document.getElementById('gamesPlaceholderTemplate');
        const clone = document.importNode(template.content, true);
        
        gamesPage.innerHTML = '';
        gamesPage.appendChild(clone);
    }

    // ==================== FILTER PANEL ====================
    function toggleFilterPanel() {
        isFilterPanelOpen = !isFilterPanelOpen;
        if (isFilterPanelOpen) {
            elements.filterPanel.classList.add('show');
            if (elements.filterToggle) elements.filterToggle.classList.add('active');
        } else {
            elements.filterPanel.classList.remove('show');
            if (elements.filterToggle) elements.filterToggle.classList.remove('active');
        }
    }

    function setupFilterPanel() {
        if (!elements.filterPanel) return;

        // Close button
        if (elements.filterClose) {
            elements.filterClose.addEventListener('click', toggleFilterPanel);
        }

        // Click outside to close (on panel header handle)
        elements.filterPanel.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-panel-header') || 
                e.target.classList.contains('filter-panel-handle')) {
                toggleFilterPanel();
            }
        });

        // Type chips
        if (elements.typeFilterChips) {
            elements.typeFilterChips.addEventListener('click', (e) => {
                const chip = e.target.closest('.chip');
                if (!chip) return;

                const type = chip.dataset.type;
                if (!type) return;

                // Update active state
                document.querySelectorAll('.chip[data-type]').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                filters.type = type;
            });
        }

        // Price inputs
        if (elements.minPrice) {
            elements.minPrice.addEventListener('input', (e) => {
                filters.minPrice = parseInt(e.target.value) || 0;
            });
        }

        if (elements.maxPrice) {
            elements.maxPrice.addEventListener('input', (e) => {
                filters.maxPrice = parseInt(e.target.value) || 999999999;
            });
        }

        // Sort select
        if (elements.sortBy) {
            elements.sortBy.addEventListener('change', (e) => {
                filters.sortBy = e.target.value;
            });
        }

        // Reset button
        if (elements.resetFilters) {
            elements.resetFilters.addEventListener('click', () => {
                resetFilters();
                toggleFilterPanel();
            });
        }

        // Apply button
        if (elements.applyFilters) {
            elements.applyFilters.addEventListener('click', () => {
                applyFilters();
                toggleFilterPanel();
            });
        }
    }

    // ==================== NAVIGATION ====================
    function setupNavigation() {
        if (!elements.navItems.length) return;

        // Set initial indicator position
        updateNavIndicator('market');

        elements.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (!page) return;

                // Update active states
                elements.navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                // Update pages
                elements.pages.forEach(p => p.classList.remove('active'));
                const targetPage = document.getElementById(`${page}Page`);
                if (targetPage) {
                    targetPage.classList.add('active');
                    currentPage = page;
                }

                // Update indicator
                updateNavIndicator(page);

                // Load page-specific data if needed
                if (page === 'market' && allUsernames.length === 0) {
                    loadMarketData();
                } else if (page === 'activity' && activities.length === 0) {
                    loadActivities();
                } else if (page === 'profile' && currentUser) {
                    loadUserUsernames();
                } else if (page === 'games') {
                    renderGames();
                }
            });
        });
    }

    function updateNavIndicator(page) {
        if (!elements.navIndicator || !elements.navItems.length) return;

        const activeItem = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (!activeItem) return;

        const index = Array.from(elements.navItems).indexOf(activeItem);
        const itemWidth = 100 / elements.navItems.length;
        elements.navIndicator.style.left = `${index * itemWidth}%`;
    }

    // ==================== SCROLL HANDLING ====================
    function setupScrollHandling() {
        if (!elements.marketMain) return;

        elements.marketMain.addEventListener('scroll', () => {
            const scrollTop = elements.marketMain.scrollTop;

            // Hide/show bottom nav
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                // Scrolling down
                elements.bottomNav.classList.add('hide');
            } else {
                // Scrolling up
                elements.bottomNav.classList.remove('hide');
            }

            // Show/hide scroll to top button
            if (scrollTop > 300) {
                // Check if 3 rows passed (approx 3 * card height)
                elements.scrollTopBtn.classList.add('show');
            } else {
                elements.scrollTopBtn.classList.remove('show');
            }

            lastScrollTop = scrollTop;

            // Clear previous timeout
            if (scrollTimeout) clearTimeout(scrollTimeout);

            // Show bottom nav after scrolling stops
            scrollTimeout = setTimeout(() => {
                elements.bottomNav.classList.remove('hide');
            }, 1500);
        });

        // Scroll to top button
        if (elements.scrollTopBtn) {
            elements.scrollTopBtn.addEventListener('click', () => {
                elements.marketMain.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    }

    // ==================== INITIALIZATION ====================
    async function init() {
        showLoading(true);

        try {
            // Initialize Telegram user
            await initTelegramUser();
            renderUserProfile();

            // Setup event listeners
            setupNavigation();
            setupFilterPanel();
            setupScrollHandling();

            // Load initial data
            await loadMarketData();
            await loadActivities();
            await loadUserUsernames();

            // Render games placeholder
            renderGames();

            // Expand Telegram Web App
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.expand();
                window.Telegram.WebApp.ready();
            }

            console.log('✅ INDOTAG MARKET initialized');
        } catch (error) {
            console.error('❌ Init error:', error);
            showToast('Gagal memuat aplikasi', 'error');
        } finally {
            showLoading(false);
        }
    }

    // Start the app
    init();
})();