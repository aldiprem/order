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
    let searchTimeout;
    let isLoadingActivities = false;

    // Filter state
    let filters = {
        search: '',
        type: 'all',
        minPrice: 0,
        maxPrice: 999999999,
        sortBy: 'latest'
    };

    // Collapsible sections state
    let collapsibleState = {
        type: true,
        price: true,
        sort: true,
        tag: true
    };

    // ==================== DOM ELEMENTS ====================
    const elements = {
        usernamePanel: document.getElementById('usernamePanel'),
        panelLoading: document.getElementById('panelLoading'),
        panelDetail: document.getElementById('panelDetail'),
        panelUsername: document.getElementById('panelUsername'),
        panelInfoGrid: document.getElementById('panelInfoGrid'),
        panelCloseBtn: document.getElementById('panelCloseBtn'),
        panelCartBtn: document.getElementById('panelCartBtn'),
        panelBuyBtn: document.getElementById('panelBuyBtn'),
        panelOfferBtn: document.getElementById('panelOfferBtn'),
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
        filterToggle: null,
        filterBadge: null,
        typeFilterChips: document.getElementById('typeFilterChips'),
        minPrice: document.getElementById('minPrice'),
        maxPrice: document.getElementById('maxPrice'),
        sortBy: document.getElementById('sortBy'),
        resetFilters: document.getElementById('resetFilters'),
        applyFilters: document.getElementById('applyFilters'),
        marketSearch: null,
        searchClearBtn: null,
        searchSubmitBtn: null
    };

    // ==================== AUDIO MANAGER (SINGLE INSTANCE) ====================
    // Gunakan AudioManager dari window jika sudah ada, jika tidak buat baru
    if (!window.AudioManager) {
        window.AudioManager = {
            enabled: true,
            volume: 0.5,
            basePath: '/order/sound/',
            sounds: {
                click: { file: 'click.mp3', instances: [], preloaded: false },
                pop: { file: 'pop.mp3', instances: [], preloaded: false },
                success: { file: 'success.mp3', instances: [], preloaded: false },
                error: { file: 'error.mp3', instances: [], preloaded: false },
                back: { file: 'back.mp3', instances: [], preloaded: false }
            },

            init: function() {
                console.log('🔊 Initializing Audio Manager...');
                if (!window.AudioContext && !HTMLAudioElement) {
                    console.warn('⚠️ Audio not supported');
                    this.enabled = false;
                    return;
                }
                this.preloadAllSounds();
                this.enableAudioOnUserInteraction();
                console.log('✅ Audio Manager initialized');
            },

            preloadAllSounds: function() {
                for (let name in this.sounds) {
                    this.preloadSound(name);
                }
            },

            preloadSound: function(name) {
                const sound = this.sounds[name];
                if (!sound || sound.preloaded) return;
                
                for (let i = 0; i < 2; i++) {
                    const audio = new Audio();
                    audio.src = this.basePath + sound.file;
                    audio.volume = this.volume;
                    audio.preload = 'auto';
                    audio.onerror = () => console.warn(`⚠️ Failed to load: ${name}`);
                    sound.instances.push(audio);
                }
                sound.preloaded = true;
            },

            enableAudioOnUserInteraction: function() {
                const enable = () => {
                    if (window.AudioContext) {
                        const context = new AudioContext();
                        if (context.state === 'suspended') context.resume();
                    }
                    this.play('click', 0.1);
                    document.removeEventListener('touchstart', enable);
                    document.removeEventListener('click', enable);
                };
                document.addEventListener('touchstart', enable, { once: true });
                document.addEventListener('click', enable, { once: true });
            },

            play: function(name, vol) {
                if (!this.enabled) return;
                const sound = this.sounds[name];
                if (!sound) return;
                
                const audio = sound.instances.find(a => a.paused || a.ended);
                if (!audio) {
                    const newAudio = new Audio();
                    newAudio.src = this.basePath + sound.file;
                    newAudio.volume = vol || this.volume;
                    sound.instances.push(newAudio);
                    this.playWithOptions(newAudio, vol);
                    return;
                }
                this.playWithOptions(audio, vol);
            },

            playWithOptions: function(audio, vol) {
                audio.pause();
                audio.currentTime = 0;
                audio.volume = vol || this.volume;
                audio.play().catch(() => {});
            }
        };
    }

    // ==================== ANTI-DOUBLE FEEDBACK ====================
    // Map untuk melacak elemen yang sudah diproses
    const processedElements = new WeakMap();
    
    // Tracking terakhir feedback global
    let lastFeedbackTime = 0;
    const FEEDBACK_COOLDOWN = 150; // ms

    // Fungsi untuk memastikan feedback hanya dipanggil sekali per interaksi
    function safeFeedback(element, hapticStyle = 'light', soundName = 'click') {
        if (!element) return;
        
        // Cek apakah elemen ini sudah diproses dalam 300ms terakhir
        if (processedElements.has(element)) {
            const lastTime = processedElements.get(element);
            if (Date.now() - lastTime < 300) {
                console.log('⚠️ Mencegah double feedback untuk elemen yang sama');
                return;
            }
        }
        
        // Catat waktu pemrosesan untuk elemen ini
        processedElements.set(element, Date.now());
        
        // Panggil feedback dengan proteksi global
        playFeedback(hapticStyle, soundName);
    }

    // ==================== HAPTIC FEEDBACK ====================
    let telegramHaptic = null;
    
    function initHaptic() {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            telegramHaptic = window.Telegram.WebApp.HapticFeedback;
            console.log('✅ Haptic feedback initialized');
            return true;
        }
        console.log('⚠️ Haptic feedback not available');
        return false;
    }

    // FUNGSI UTAMA - SATU FUNGSI UNTUK SEMUA FEEDBACK DENGAN GLOBAL DEBOUNCE
    function playFeedback(hapticStyle = 'light', soundName = 'click') {
        // Cegah double trigger dalam 150ms (GLOBAL)
        const now = Date.now();
        if (now - lastFeedbackTime < FEEDBACK_COOLDOWN) {
            console.log('⚠️ Global debounce mencegah double');
            return;
        }
        lastFeedbackTime = now;
        
        // Haptic
        if (window.Telegram?.WebApp?.HapticFeedback) {
            try {
                switch(hapticStyle) {
                    case 'light':
                    case 'medium':
                    case 'heavy':
                        window.Telegram.WebApp.HapticFeedback.impactOccurred(hapticStyle);
                        break;
                    case 'success':
                    case 'error':
                    case 'warning':
                        window.Telegram.WebApp.HapticFeedback.notificationOccurred(hapticStyle);
                        break;
                    case 'selection':
                        window.Telegram.WebApp.HapticFeedback.selectionChanged();
                        break;
                    default:
                        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                }
            } catch (e) {}
        }
        
        // Audio
        if (window.AudioManager) {
            window.AudioManager.play(soundName);
        }
    }

    // ==================== UTILITY FUNCTIONS ====================
    function showToast(message, type = 'info', duration = 3000) {
        if (!elements.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        elements.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
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

            localStorage.setItem('market_user', JSON.stringify(currentUser));

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

        const savedUser = localStorage.getItem('market_user');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            return currentUser;
        }

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
      
        const userProfileCard = document.querySelector('.user-profile-card');
        if (userProfileCard) {
            // Hapus event listener lama dengan clone
            const newCard = userProfileCard.cloneNode(true);
            userProfileCard.parentNode.replaceChild(newCard, userProfileCard);
            
            newCard.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                safeFeedback(e.currentTarget, 'light', 'click');
                document.querySelector('.nav-item[data-page="profile"]')?.click();
            });
        }
    }

    // ==================== DATA LOADING ====================
    async function loadMarketData() {
        showLoading(true);
        playFeedback('medium', 'pop');
      
        try {
            const usernames = await fetchWithRetry(`${API_BASE_URL}/api/market`, {
                method: 'GET'
            });
      
            allUsernames = usernames || [];
            applyFilters();
            playFeedback('success', 'success');
        } catch (error) {
            console.error('Error loading market data:', error);
            showToast('Gagal memuat data market', 'error');
            playFeedback('error', 'error');
            allUsernames = [];
        } finally {
            showLoading(false);
        }
    }

    // ==================== ACTIVITY FUNCTIONS ====================
    async function loadActivities() {
        const activityPage = document.getElementById('activityPage');
        if (!activityPage) return;
        
        renderActivitySkeleton();
        isLoadingActivities = true;

        try {
            let response;
            try {
                response = await fetchWithRetry(`${API_BASE_URL}/api/activities/all`, {
                    method: 'GET'
                });
            } catch (error) {
                console.log('Activities all endpoint not available');
                response = [];
            }

            if (response && Array.isArray(response)) {
                activities = response.filter(activity => 
                    !activity.action?.includes('USER_START') &&
                    !activity.action?.includes('START')
                );
            } else {
                activities = [];
            }

            renderActivities();
        } catch (error) {
            console.error('Error loading activities:', error);
            activities = [];
            renderActivities();
        } finally {
            isLoadingActivities = false;
        }
    }

    function renderActivitySkeleton() {
        const activityPage = document.getElementById('activityPage');
        if (!activityPage) return;
        
        let skeletonHtml = '<div class="activity-list">';
        for (let i = 0; i < 5; i++) {
            const template = document.getElementById('activitySkeletonTemplate');
            const clone = document.importNode(template.content, true);
            const div = document.createElement('div');
            div.appendChild(clone);
            skeletonHtml += div.innerHTML;
        }
        skeletonHtml += '</div>';
        activityPage.innerHTML = skeletonHtml;
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

    // ==================== FILTER FUNCTIONS ====================
    function applyFilters() {
        let filtered = [...allUsernames];
      
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(u =>
                u.username.toLowerCase().includes(searchLower) ||
                (u.based_on && u.based_on.toLowerCase().includes(searchLower))
            );
        }
      
        if (filters.type !== 'all') {
            filtered = filtered.filter(u => u.username_type === filters.type);
        }
      
        filtered = filtered.filter(u =>
            (u.price || 0) >= filters.minPrice &&
            (u.price || 0) <= filters.maxPrice
        );
      
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

        if (elements.marketSearch) {
            elements.marketSearch.value = '';
            if (elements.searchClearBtn) {
                elements.searchClearBtn.classList.remove('visible');
            }
        }
        
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
      
        const headerHtml = `
            <div class="market-header-actions">
                <div class="market-search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" id="marketSearchInput" placeholder="Cari username atau based on..." value="${escapeHtml(filters.search)}" autocomplete="off">
                    <button class="search-clear-btn" id="searchClearBtn">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="search-submit-btn" id="searchSubmitBtn">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
                <button class="filter-toggle-btn" id="filterToggleBtn">
                    <i class="fas fa-sliders-h"></i>
                    <span class="filter-badge" id="filterBadge" style="display: ${activeFilterCount > 0 ? 'flex' : 'none'};">${activeFilterCount}</span>
                </button>
            </div>
        `;
      
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
                clone.querySelector('.username-type-badge').textContent = username.username_type || 'UNCOMMON';
                clone.querySelector('.based-on-value').textContent = username.based_on || '';
                clone.querySelector('.price-value').textContent = formatRupiah(username.price);
      
                const div = document.createElement('div');
                div.appendChild(clone);
                gridHtml += div.innerHTML;
            });
            gridHtml += '</div>';
        }
      
        marketPage.innerHTML = headerHtml + gridHtml;
      
        elements.marketSearch = document.getElementById('marketSearchInput');
        elements.filterToggle = document.getElementById('filterToggleBtn');
        elements.filterBadge = document.getElementById('filterBadge');
        elements.searchClearBtn = document.getElementById('searchClearBtn');
        elements.searchSubmitBtn = document.getElementById('searchSubmitBtn');
      
        if (elements.marketSearch) {
            const updateSearchButtons = () => {
                const hasValue = elements.marketSearch.value.length > 0;
                if (hasValue) {
                    elements.marketSearch.style.paddingRight = '100px';
                    elements.searchClearBtn?.classList.add('visible');
                    elements.searchSubmitBtn?.classList.add('visible');
                } else {
                    elements.marketSearch.style.paddingRight = '20px';
                    elements.searchClearBtn?.classList.remove('visible');
                    elements.searchSubmitBtn?.classList.remove('visible');
                }
            };
      
            updateSearchButtons();
            elements.marketSearch.addEventListener('input', updateSearchButtons);
            
            // Hapus event listener lama dengan clone untuk input
            const newSearchInput = elements.marketSearch.cloneNode(true);
            elements.marketSearch.parentNode.replaceChild(newSearchInput, elements.marketSearch);
            elements.marketSearch = newSearchInput;
            
            elements.marketSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    playFeedback('medium', 'pop');
                    filters.search = elements.marketSearch.value;
                    applyFilters();
                    elements.marketSearch.blur();
                }
            });
        }
      
        // Clear button
        if (elements.searchClearBtn) {
            const newClearBtn = elements.searchClearBtn.cloneNode(true);
            elements.searchClearBtn.parentNode.replaceChild(newClearBtn, elements.searchClearBtn);
            elements.searchClearBtn = newClearBtn;
            
            elements.searchClearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                safeFeedback(e.currentTarget, 'light', 'click');
                
                if (elements.marketSearch) {
                    elements.marketSearch.value = '';
                    filters.search = '';
                    applyFilters();
                    elements.marketSearch.style.paddingRight = '20px';
                    elements.searchClearBtn.classList.remove('visible');
                    elements.searchSubmitBtn.classList.remove('visible');
                }
            });
        }
      
        // Submit button
        if (elements.searchSubmitBtn) {
            const newSubmitBtn = elements.searchSubmitBtn.cloneNode(true);
            elements.searchSubmitBtn.parentNode.replaceChild(newSubmitBtn, elements.searchSubmitBtn);
            elements.searchSubmitBtn = newSubmitBtn;
            
            elements.searchSubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                safeFeedback(e.currentTarget, 'medium', 'pop');
                
                if (elements.marketSearch) {
                    filters.search = elements.marketSearch.value;
                    applyFilters();
                    elements.marketSearch.blur();
                }
            });
        }
      
        // Filter toggle button
        if (elements.filterToggle) {
            const newFilterToggle = elements.filterToggle.cloneNode(true);
            elements.filterToggle.parentNode.replaceChild(newFilterToggle, elements.filterToggle);
            elements.filterToggle = newFilterToggle;
            
            elements.filterToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                safeFeedback(e.currentTarget, 'medium', 'pop');
                toggleFilterPanel();
            });
        }
      
        // Setup untuk username cards
        setTimeout(() => {
            if (typeof setupPanel === 'function' && !window.panelSetupDone) {
                setupPanel();
                window.panelSetupDone = true;
            }
          
            document.querySelectorAll('.username-card').forEach(card => {
                const newCard = card.cloneNode(true);
                card.parentNode.replaceChild(newCard, card);
          
                newCard.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    safeFeedback(e.currentTarget, 'light', 'click');
                    
                    const usernameElement = newCard.querySelector('.username');
                    if (usernameElement) {
                        const username = usernameElement.textContent.trim();
                        console.log('🔍 Card clicked - username:', username);
                        
                        setTimeout(() => {
                            if (typeof showUsernamePanel === 'function') {
                                showUsernamePanel(username);
                            }
                        }, 50);
                    }
                });
            });
          
            const emptyMarket = document.querySelector('.empty-market');
            if (emptyMarket) {
                const newEmptyMarket = emptyMarket.cloneNode(true);
                emptyMarket.parentNode.replaceChild(newEmptyMarket, emptyMarket);
                
                newEmptyMarket.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    safeFeedback(e.currentTarget, 'light', 'click');
                });
            }
        }, 100);
    }

    function renderActivities() {
        const activityPage = document.getElementById('activityPage');
        if (!activityPage) return;

        if (!activities || activities.length === 0) {
            activityPage.innerHTML = `
                <div class="empty-market">
                    <i class="fas fa-history"></i>
                    <h3>Belum Ada Aktivitas</h3>
                    <p>Aktivitas username akan muncul di sini</p>
                </div>
            `;
            return;
        }

        let html = '<div class="activity-list">';

        activities.forEach(activity => {
            const template = document.getElementById('activityItemTemplate');
            const clone = document.importNode(template.content, true);

            let icon = 'fas fa-info-circle';
            if (activity.action?.includes('LISTED')) icon = 'fas fa-tag';
            else if (activity.action?.includes('PRICE')) icon = 'fas fa-credit-card';
            else if (activity.action?.includes('BASED_ON')) icon = 'fas fa-pencil-alt';
            else if (activity.action?.includes('ADDED')) icon = 'fas fa-plus-circle';
            else if (activity.action?.includes('VERIFY')) icon = 'fas fa-check-circle';

            clone.querySelector('.activity-icon i').className = icon;
            clone.querySelector('.activity-title').textContent = activity.details || 'Aktivitas baru';
            
            const usernameMatch = activity.details?.match(/@(\w+)/);
            if (usernameMatch) {
                clone.querySelector('.activity-username').textContent = usernameMatch[0];
            } else if (activity.username) {
                clone.querySelector('.activity-username').textContent = `@${activity.username}`;
            } else {
                clone.querySelector('.activity-username').textContent = '';
            }
            
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

    // ==================== COLLAPSIBLE FILTER SECTIONS ====================
    function setupCollapsibleSections() {
        const sections = document.querySelectorAll('.filter-section.collapsible');
        
        sections.forEach(section => {
            const header = section.querySelector('.filter-section-header');
            const sectionName = header?.dataset.section;
            
            if (!header || !sectionName) return;
            
            if (collapsibleState[sectionName]) {
                section.classList.add('expanded');
            } else {
                section.classList.remove('expanded');
            }
            
            // Hapus event listener lama dengan clone
            const newHeader = header.cloneNode(true);
            header.parentNode.replaceChild(newHeader, header);
            
            newHeader.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                safeFeedback(e.currentTarget, 'light', 'click');
                
                collapsibleState[sectionName] = !collapsibleState[sectionName];
                
                const section = newHeader.closest('.filter-section');
                if (collapsibleState[sectionName]) {
                    section.classList.add('expanded');
                } else {
                    section.classList.remove('expanded');
                }
            });
        });
    }

    // ==================== FILTER PANEL ====================
    function toggleFilterPanel() { 
        // Feedback sudah dipanggil dari tombol, jangan panggil lagi di sini
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

        // Filter close button
        if (elements.filterClose) {
            const newFilterClose = elements.filterClose.cloneNode(true);
            elements.filterClose.parentNode.replaceChild(newFilterClose, elements.filterClose);
            elements.filterClose = newFilterClose;
            
            elements.filterClose.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                safeFeedback(e.currentTarget, 'light', 'back');
                toggleFilterPanel();
            });
        }

        elements.filterPanel.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-panel-header') || 
                e.target.classList.contains('filter-panel-handle')) {
                e.preventDefault();
                e.stopPropagation();
                safeFeedback(e.currentTarget, 'light', 'pop');
                toggleFilterPanel();
            }
        });

        // Type filter chips
        if (elements.typeFilterChips) {
            // Gunakan event delegation dengan clone
            const newChips = elements.typeFilterChips.cloneNode(true);
            elements.typeFilterChips.parentNode.replaceChild(newChips, elements.typeFilterChips);
            elements.typeFilterChips = newChips;
            
            elements.typeFilterChips.addEventListener('click', (e) => {
                const chip = e.target.closest('.chip');
                if (!chip) return;
                
                e.preventDefault();
                e.stopPropagation();
                
                safeFeedback(chip, 'selection', 'click');
                
                const type = chip.dataset.type;
                if (!type) return;
                
                document.querySelectorAll('.chip[data-type]').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                
                filters.type = type;
            });
        }

        // Price inputs
        if (elements.minPrice) {
            const newMinPrice = elements.minPrice.cloneNode(true);
            elements.minPrice.parentNode.replaceChild(newMinPrice, elements.minPrice);
            elements.minPrice = newMinPrice;
            
            elements.minPrice.addEventListener('input', (e) => {
                filters.minPrice = parseInt(e.target.value) || 0;
            });
        }

        if (elements.maxPrice) {
            const newMaxPrice = elements.maxPrice.cloneNode(true);
            elements.maxPrice.parentNode.replaceChild(newMaxPrice, elements.maxPrice);
            elements.maxPrice = newMaxPrice;
            
            elements.maxPrice.addEventListener('input', (e) => {
                filters.maxPrice = parseInt(e.target.value) || 999999999;
            });
        }

        // Sort select
        if (elements.sortBy) {
            const newSortBy = elements.sortBy.cloneNode(true);
            elements.sortBy.parentNode.replaceChild(newSortBy, elements.sortBy);
            elements.sortBy = newSortBy;
            
            elements.sortBy.addEventListener('change', (e) => {
                filters.sortBy = e.target.value;
            });
        }

        // Reset filters button
        if (elements.resetFilters) {
            const newResetBtn = elements.resetFilters.cloneNode(true);
            elements.resetFilters.parentNode.replaceChild(newResetBtn, elements.resetFilters);
            elements.resetFilters = newResetBtn;
            
            elements.resetFilters.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                safeFeedback(e.currentTarget, 'warning', 'pop');
                
                setTimeout(() => {
                    resetFilters();
                    toggleFilterPanel();
                }, 50);
            });
        }

        // Apply filters button
        if (elements.applyFilters) {
            const newApplyBtn = elements.applyFilters.cloneNode(true);
            elements.applyFilters.parentNode.replaceChild(newApplyBtn, elements.applyFilters);
            elements.applyFilters = newApplyBtn;
            
            elements.applyFilters.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                safeFeedback(e.currentTarget, 'success', 'success');
                
                setTimeout(() => {
                    applyFilters();
                    toggleFilterPanel();
                }, 50);
            });
        }

        setupCollapsibleSections();
    }

    // ==================== NAVIGATION ====================
    function setupNavigation() {
        if (!elements.navItems.length) return;

        updateNavIndicator('market');

        elements.navItems.forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            newItem.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                safeFeedback(e.currentTarget, 'light', 'click');
                
                const page = newItem.dataset.page;
                if (!page) return;

                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                newItem.classList.add('active');

                document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
                const targetPage = document.getElementById(`${page}Page`);
                if (targetPage) {
                    targetPage.classList.add('active');
                    currentPage = page;
                }

                updateNavIndicator(page);

                if (page === 'market' && allUsernames.length === 0) {
                    loadMarketData();
                } else if (page === 'activity') {
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

        const index = Array.from(document.querySelectorAll('.nav-item')).indexOf(activeItem);
        const itemWidth = 100 / document.querySelectorAll('.nav-item').length;
        elements.navIndicator.style.left = `${index * itemWidth}%`;
    }

    // ==================== SCROLL HANDLING ====================
    function setupScrollHandling() {
        if (!elements.marketMain) return;

        elements.marketMain.addEventListener('scroll', () => {
            const scrollTop = elements.marketMain.scrollTop;

            if (scrollTop > lastScrollTop && scrollTop > 100) {
                elements.bottomNav.classList.add('hide');
            } else {
                elements.bottomNav.classList.remove('hide');
            }

            if (scrollTop > 300) {
                if (elements.scrollTopBtn.classList.contains('show')) {
                    // Already showing
                } else {
                    elements.scrollTopBtn.classList.remove('hide');
                    elements.scrollTopBtn.classList.add('show');
                }
            } else {
                if (elements.scrollTopBtn.classList.contains('show')) {
                    elements.scrollTopBtn.classList.remove('show');
                    elements.scrollTopBtn.classList.add('hide');
                    
                    setTimeout(() => {
                        elements.scrollTopBtn.classList.remove('hide');
                    }, 300);
                }
            }

            lastScrollTop = scrollTop;

            if (scrollTimeout) clearTimeout(scrollTimeout);

            scrollTimeout = setTimeout(() => {
                elements.bottomNav.classList.remove('hide');
            }, 1500);
        });

        // Scroll to top button
        if (elements.scrollTopBtn) {
            const newScrollBtn = elements.scrollTopBtn.cloneNode(true);
            elements.scrollTopBtn.parentNode.replaceChild(newScrollBtn, elements.scrollTopBtn);
            elements.scrollTopBtn = newScrollBtn;
            
            elements.scrollTopBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                safeFeedback(e.currentTarget, 'heavy', 'pop');
                elements.marketMain.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    }

    // ==================== AUTO HAPTIC FOR ALL BUTTONS (DIPERBAIKI) ====================
    function setupHapticForButtons() {
        const clickableElements = document.querySelectorAll('button, .nav-item, .chip, .filter-section-header, .filter-close, .search-clear-btn, .search-submit-btn, .filter-toggle-btn, .filter-btn, .scroll-top-btn, .user-profile-card');
      
        clickableElements.forEach(element => {
            // Hanya tambahkan jika belum memiliki event listener
            if (element.getAttribute('data-haptic-processed')) return;
            
            element.setAttribute('data-haptic-processed', 'true');
            
            element.addEventListener('click', (e) => {
                // Cegah bubbling dan double
                if (e.hapticProcessedByGlobal) return;
                e.hapticProcessedByGlobal = true;
                
                // Hanya trigger jika belum ada handler spesifik
                if (e.defaultPrevented) return;
                
                // Gunakan safeFeedback untuk mencegah double
                if (element.classList.contains('nav-item')) {
                    safeFeedback(element, 'light', 'click');
                } else if (element.classList.contains('chip')) {
                    // Chips sudah dihandle di tempat lain
                    return;
                } else if (element.classList.contains('filter-btn') || element.classList.contains('apply')) {
                    // Filter buttons sudah dihandle
                    return;
                } else if (element.classList.contains('reset')) {
                    // Reset sudah dihandle
                    return;
                } else if (element.classList.contains('filter-close')) {
                    // Close button sudah dihandle di panel
                    return;
                } else if (element.classList.contains('scroll-top-btn')) {
                    safeFeedback(element, 'heavy', 'pop');
                } else if (element.classList.contains('search-clear-btn') || element.classList.contains('search-submit-btn')) {
                    // Search buttons sudah dihandle
                    return;
                } else if (element.classList.contains('filter-toggle-btn')) {
                    // Filter toggle sudah dihandle
                    return;
                } else if (element.classList.contains('user-profile-card')) {
                    // Profile card sudah dihandle
                    return;
                } else {
                    safeFeedback(element, 'light', 'click');
                }
            }, { once: false });
        });
    }

    // ==================== SETUP PANEL ====================
    function setupPanel() {
        if (!elements.usernamePanel) return;
        
        let overlay = document.getElementById('panelOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'panelOverlay';
            overlay.className = 'panel-overlay';
            document.body.appendChild(overlay);
        }
        
        let startY = 0;
        let currentY = 0;
        let isDragging = false;
        let panelHeight = 0;
        
        // Panel close button
        if (elements.panelCloseBtn) {
            const newCloseBtn = elements.panelCloseBtn.cloneNode(true);
            elements.panelCloseBtn.parentNode.replaceChild(newCloseBtn, elements.panelCloseBtn);
            elements.panelCloseBtn = newCloseBtn;
            
            elements.panelCloseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                safeFeedback(e.currentTarget, 'light', 'back');
                
                setTimeout(() => {
                    hideUsernamePanel();
                }, 50);
            });
        }
        
        // Panel cart button
        if (elements.panelCartBtn) {
            const newCartBtn = elements.panelCartBtn.cloneNode(true);
            elements.panelCartBtn.parentNode.replaceChild(newCartBtn, elements.panelCartBtn);
            elements.panelCartBtn = newCartBtn;
            
            elements.panelCartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                safeFeedback(e.currentTarget, 'medium', 'click');
                showToast('Fitur keranjang akan segera hadir!', 'info');
            });
        }
        
        // Panel buy button
        if (elements.panelBuyBtn) {
            const newBuyBtn = elements.panelBuyBtn.cloneNode(true);
            elements.panelBuyBtn.parentNode.replaceChild(newBuyBtn, elements.panelBuyBtn);
            elements.panelBuyBtn = newBuyBtn;
            
            elements.panelBuyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                safeFeedback(e.currentTarget, 'heavy', 'success');
                showToast('Fitur pembelian akan segera hadir!', 'info');
            });
        }
        
        // Panel offer button
        if (elements.panelOfferBtn) {
            const newOfferBtn = elements.panelOfferBtn.cloneNode(true);
            elements.panelOfferBtn.parentNode.replaceChild(newOfferBtn, elements.panelOfferBtn);
            elements.panelOfferBtn = newOfferBtn;
            
            elements.panelOfferBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                safeFeedback(e.currentTarget, 'medium', 'click');
                showToast('Fitur penawaran akan segera hadir!', 'info');
            });
        }
        
        // Overlay click
        overlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            hideUsernamePanel();
        });
        
        // Drag handling
        const handleTouchStart = (e) => {
            if (e.target.closest('button')) return;
            startY = e.touches[0].clientY;
            isDragging = true;
            panelHeight = elements.usernamePanel.offsetHeight;
            elements.usernamePanel.style.transition = 'none';
            e.preventDefault();
        };
        
        const handleTouchMove = (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            
            if (deltaY > 0) {
                const maxDrag = panelHeight * 0.8;
                const translateY = Math.min(deltaY, maxDrag);
                elements.usernamePanel.style.transform = `translateY(${translateY}px)`;
                const opacity = Math.max(0, 1 - (deltaY / maxDrag));
                overlay.style.opacity = opacity;
            }
            e.preventDefault();
        };
        
        const handleTouchEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            const deltaY = currentY - startY;
            const panelHeight = elements.usernamePanel.offsetHeight;
            elements.usernamePanel.style.transition = '';
            
            if (deltaY > panelHeight * 0.25) {
                hideUsernamePanel();
            } else {
                elements.usernamePanel.style.transform = '';
                overlay.style.opacity = '1';
            }
            
            startY = 0;
            currentY = 0;
        };
        
        const panelHandle = document.querySelector('.panel-handle');
        if (panelHandle) {
            const newHandle = panelHandle.cloneNode(true);
            panelHandle.parentNode.replaceChild(newHandle, panelHandle);
            
            newHandle.addEventListener('touchstart', handleTouchStart, { passive: false });
            newHandle.addEventListener('touchmove', handleTouchMove, { passive: false });
            newHandle.addEventListener('touchend', handleTouchEnd);
            newHandle.addEventListener('touchcancel', () => {
                isDragging = false;
                elements.usernamePanel.style.transition = '';
                elements.usernamePanel.style.transform = '';
                overlay.style.opacity = '1';
            });
        }
        
        const newPanel = elements.usernamePanel.cloneNode(true);
        elements.usernamePanel.parentNode.replaceChild(newPanel, elements.usernamePanel);
        elements.usernamePanel = newPanel;
        
        elements.usernamePanel.addEventListener('touchstart', handleTouchStart, { passive: false });
        elements.usernamePanel.addEventListener('touchmove', handleTouchMove, { passive: false });
        elements.usernamePanel.addEventListener('touchend', handleTouchEnd);
        elements.usernamePanel.addEventListener('touchcancel', () => {
            isDragging = false;
            elements.usernamePanel.style.transition = '';
            elements.usernamePanel.style.transform = '';
            overlay.style.opacity = '1';
        });
    }

    // ==================== PANEL FUNCTIONS ====================
    function showUsernamePanel(username) {
        console.log('🔍 showUsernamePanel called with:', username);
        
        if (!elements.usernamePanel) {
            console.error('usernamePanel element not found!');
            return;
        }
        
        playFeedback('medium', 'pop');
        
        elements.panelLoading.style.display = 'flex';
        elements.panelDetail.style.display = 'none';
        elements.usernamePanel.style.transform = '';
        elements.usernamePanel.classList.add('show');
        
        const overlay = document.getElementById('panelOverlay');
        if (overlay) {
            overlay.classList.add('show');
            overlay.style.opacity = '1';
        }
        
        document.body.classList.add('panel-open');
        
        loadUsernameDetailFromAPI(username);
    }

    function hideUsernamePanel() {
        if (!elements.usernamePanel) return;
        elements.usernamePanel.classList.remove('show');
        
        const overlay = document.getElementById('panelOverlay');
        if (overlay) overlay.classList.remove('show');
        
        document.body.classList.remove('panel-open');
        elements.usernamePanel.style.transform = '';
        console.log('🔍 Panel hidden');
    }

    function renderUsernamePanel(data) {
        console.log('🔍 renderUsernamePanel called with:', data);
        
        if (!elements.panelUsername || !elements.panelInfoGrid) {
            console.error('Panel elements not found!');
            return;
        }
        
        elements.panelUsername.textContent = `@${data.username}`;
        
        const kindText = (data.kind || 'MULCHAR INDO').toUpperCase();
        const typeText = (data.type === 'channel' ? 'CHANNEL' : 'USER').toUpperCase();
        
        const date = data.updated_at ? new Date(data.updated_at) : new Date();
        const formattedDate = date.toLocaleDateString('id-ID', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).toUpperCase();
        
        const priceText = formatRupiah(data.price).toUpperCase();
        const basedOnText = (data.based_on || '-').toUpperCase();
        const shapeText = (data.username_type || 'OP').toUpperCase();
        
        const infoGrid = `
            <div class="info-row">
                <span class="info-label"><i class="fas fa-at"></i> BASED ON</span>
                <span class="info-value">${basedOnText}</span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-shapes"></i> BENTUK</span>
                <span class="info-value"><span class="badge">${shapeText}</span></span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-tag"></i> JENIS</span>
                <span class="info-value">${kindText}</span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-user"></i> TYPE</span>
                <span class="info-value">${typeText}</span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-credit-card"></i> HARGA</span>
                <span class="info-value price">${priceText}</span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-calendar-alt"></i> ADDED</span>
                <span class="info-value date">${formattedDate}</span>
            </div>
        `;
        
        elements.panelInfoGrid.innerHTML = infoGrid;
        elements.panelLoading.style.display = 'none';
        elements.panelDetail.style.display = 'block';
        console.log('✅ Panel rendered successfully');
    }

    async function loadUsernameDetailFromAPI(username) {
        try {
            console.log('🔍 Fetching detail for:', username);
            
            const response = await fetchWithRetry(`${API_BASE_URL}/api/username/${username}`, {
                method: 'GET'
            });
            
            console.log('✅ API Response:', response);
            
            if (response.error) throw new Error(response.error);
            
            renderUsernamePanel(response);
            
        } catch (error) {
            console.error('Error loading username detail:', error);
            showToast('Gagal memuat detail username', 'error');
            hideUsernamePanel();
        }
    }

    // ==================== INITIALIZATION ====================
    async function init() {
        showLoading(true);
      
        try {
            console.log('📳 Initializing haptic feedback...');
            
            // Inisialisasi Audio Manager
            if (window.AudioManager) {
                window.AudioManager.init();
            }
      
            if (window.Telegram?.WebApp) {
                console.log('📱 Telegram WebApp detected, version:', window.Telegram.WebApp.version);
                initHaptic();
                setTimeout(() => {
                    playFeedback('light', 'click');
                    console.log('📳 Test feedback successful');
                }, 500);
            } else {
                console.log('⚠️ Telegram WebApp not detected - running in browser mode');
                window.Telegram = {
                    WebApp: {
                        HapticFeedback: {
                            impactOccurred: (style) => console.log(`📳 [BROWSER] Haptic: ${style}`),
                            notificationOccurred: (type) => console.log(`📳 [BROWSER] Notification: ${type}`),
                            selectionChanged: () => console.log(`📳 [BROWSER] Selection changed`)
                        }
                    }
                };
                initHaptic();
            }
      
            await initTelegramUser();
            renderUserProfile();
      
            setupNavigation();
            setupFilterPanel();
            setupScrollHandling();
      
            setTimeout(() => {
                setupHapticForButtons();
                console.log('✅ Haptic buttons initialized');
            }, 200);
      
            await loadMarketData();
            await loadUserUsernames();
            
            setupPanel();
            renderGames();
      
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.expand();
                window.Telegram.WebApp.ready();
                console.log('📱 Telegram WebApp ready');
            }
      
            console.log('✅ INDOTAG MARKET initialized successfully');
      
        } catch (error) {
            console.error('❌ Init error:', error);
            showToast('Gagal memuat aplikasi', 'error');
            try { playFeedback('error', 'error'); } catch (e) {}
        } finally {
            showLoading(false);
        }
    }

    init();
})();