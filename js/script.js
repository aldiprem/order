// script.js - INDOTAG MARKET Main Script (OPTIMIZED WITH HOWLER.JS)

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

    // ==================== HOWLER.JS AUDIO MANAGER ====================
    if (!window.AudioManager) {
        window.AudioManager = {
            sounds: {},
            enabled: true,
            isReady: false,
            pendingPlays: [],
            
            init: function() {
                console.log('🔊 Initializing Howler Audio Manager...');
                
                // Cek apakah Howler.js tersedia
                if (typeof Howl === 'undefined') {
                    console.warn('⚠️ Howler.js not loaded, using fallback');
                    this.createFallback();
                    return;
                }
                
                // Daftar sound files
                const soundFiles = {
                    click: '/order/sound/click.mp3',
                    pop: '/order/sound/pop.mp3',
                    success: '/order/sound/success.mp3',
                    error: '/order/sound/error.mp3',
                    back: '/order/sound/back.mp3'
                };
                
                // Load semua sound
                let loadedCount = 0;
                const totalSounds = Object.keys(soundFiles).length;
                
                Object.entries(soundFiles).forEach(([name, src]) => {
                    try {
                        this.sounds[name] = new Howl({
                            src: [src],
                            html5: true, // Penting untuk mobile
                            volume: 0.5,
                            preload: true,
                            rate: 1.0,
                            autoplay: false,
                            onload: () => {
                                loadedCount++;
                                console.log(`✅ Sound loaded: ${name} (${loadedCount}/${totalSounds})`);
                                
                                if (loadedCount === totalSounds) {
                                    this.isReady = true;
                                    console.log('✅ All sounds ready');
                                    this.processPendingPlays();
                                }
                            },
                            onloaderror: (id, error) => {
                                console.warn(`⚠️ Failed to load ${name}:`, error);
                                loadedCount++;
                                if (loadedCount === totalSounds) {
                                    this.isReady = true;
                                    this.processPendingPlays();
                                }
                            },
                            onplayerror: (id, error) => {
                                console.warn(`⚠️ Play error for ${name}:`, error);
                                // Auto-unlock untuk mobile
                                if (Howler.ctx && Howler.ctx.state === 'suspended') {
                                    Howler.ctx.resume().then(() => {
                                        this.play(name, this.sounds[name].volume());
                                    });
                                }
                            }
                        });
                    } catch (e) {
                        console.warn(`⚠️ Error creating sound ${name}:`, e);
                        loadedCount++;
                    }
                });
                
                // Setup auto-unlock untuk iOS
                this.setupAutoUnlock();
                
                console.log('✅ Howler Audio Manager initialized');
            },
            
            createFallback: function() {
                console.log('🔊 Using fallback AudioManager');
                this.sounds = {
                    click: { instances: [], preloaded: false },
                    pop: { instances: [], preloaded: false },
                    success: { instances: [], preloaded: false },
                    error: { instances: [], preloaded: false },
                    back: { instances: [], preloaded: false }
                };
                this.basePath = '/order/sound/';
                this.volume = 0.5;
                
                // Preload semua sound
                for (let name in this.sounds) {
                    for (let i = 0; i < 2; i++) {
                        const audio = new Audio();
                        audio.src = this.basePath + name + '.mp3';
                        audio.volume = this.volume;
                        audio.preload = 'auto';
                        this.sounds[name].instances.push(audio);
                    }
                    this.sounds[name].preloaded = true;
                }
                
                this.isReady = true;
                this.setupAutoUnlock();
            },
            
            setupAutoUnlock: function() {
                const unlockAudio = () => {
                    if (Howler && Howler.ctx && Howler.ctx.state === 'suspended') {
                        Howler.ctx.resume().then(() => {
                            console.log('✅ AudioContext unlocked');
                        }).catch(e => {
                            console.warn('⚠️ Failed to unlock AudioContext:', e);
                        });
                    }
                    
                    // Test play dengan volume 0 untuk unlock
                    this.play('click', 0);
                    
                    document.removeEventListener('touchstart', unlockAudio);
                    document.removeEventListener('click', unlockAudio);
                    document.removeEventListener('touchend', unlockAudio);
                };
                
                document.addEventListener('touchstart', unlockAudio, { once: true });
                document.addEventListener('click', unlockAudio, { once: true });
                document.addEventListener('touchend', unlockAudio, { once: true });
            },
            
            processPendingPlays: function() {
                if (this.pendingPlays.length > 0) {
                    console.log(`🎵 Processing ${this.pendingPlays.length} pending plays`);
                    this.pendingPlays.forEach(pending => {
                        this.play(pending.name, pending.volume);
                    });
                    this.pendingPlays = [];
                }
            },
            
            play: function(name, volume = 0.5) {
                if (!this.enabled) return false;
                
                // Jika belum ready, queue dulu
                if (!this.isReady) {
                    this.pendingPlays.push({ name, volume });
                    return false;
                }
                
                try {
                    // Cek apakah menggunakan Howl atau fallback
                    if (this.sounds[name] instanceof Howl) {
                        // Howler implementation
                        const sound = this.sounds[name];
                        sound.volume(volume);
                        sound.play();
                    } else if (this.sounds[name] && this.sounds[name].instances) {
                        // Fallback implementation
                        const sound = this.sounds[name];
                        const audio = sound.instances.find(a => a.paused || a.ended);
                        if (audio) {
                            audio.volume = volume;
                            audio.currentTime = 0;
                            audio.play().catch(() => {});
                        } else {
                            const newAudio = new Audio(this.basePath + name + '.mp3');
                            newAudio.volume = volume;
                            sound.instances.push(newAudio);
                            newAudio.play().catch(() => {});
                        }
                    }
                    return true;
                } catch (e) {
                    console.warn(`⚠️ Error playing ${name}:`, e);
                    return false;
                }
            },
            
            stopAll: function() {
                if (Howler) {
                    Howler.stop();
                }
            },
            
            mute: function(mute = true) {
                if (Howler) {
                    Howler.mute(mute);
                }
                this.enabled = !mute;
            },
            
            setVolume: function(volume) {
                if (Howler) {
                    Howler.volume(volume);
                }
                this.volume = volume;
            }
        };
    }

    // ==================== ANTI-DOUBLE FEEDBACK ====================
    let lastFeedbackTime = 0;
    const FEEDBACK_COOLDOWN = 150; // ms

    function playFeedback(hapticStyle = 'light', soundName = 'click') {
        const now = Date.now();
        if (now - lastFeedbackTime < FEEDBACK_COOLDOWN) {
            return;
        }
        lastFeedbackTime = now;
        
        // Haptic feedback
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
        
        // Audio feedback
        if (window.AudioManager) {
            window.AudioManager.play(soundName);
        }
    }

    // ==================== HAPTIC FEEDBACK (LEGACY) ====================
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
            id: 7998861975,
            first_name: 'Al, Ways',
            last_name: '',
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
            userProfileCard.addEventListener('click', () => {
                playFeedback('light', 'click');
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
            elements.marketSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    playFeedback('medium', 'pop');
                    filters.search = elements.marketSearch.value;
                    applyFilters();
                    elements.marketSearch.blur();
                }
            });
        }
      
        if (elements.searchClearBtn) {
            elements.searchClearBtn.addEventListener('click', (e) => {
                e.hapticProcessed = true;
                playFeedback('light', 'click');
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
      
        if (elements.searchSubmitBtn) {
            elements.searchSubmitBtn.addEventListener('click', (e) => {
                e.hapticProcessed = true;
                playFeedback('medium', 'pop');
                if (elements.marketSearch) {
                    filters.search = elements.marketSearch.value;
                    applyFilters();
                    elements.marketSearch.blur();
                }
            });
        }
      
        if (elements.filterToggle) {
            elements.filterToggle.addEventListener('click', (e) => {
                e.hapticProcessed = true;
                playFeedback('medium', 'pop');
                toggleFilterPanel();
            });
        }
      
        setTimeout(() => {
            if (typeof setupPanel === 'function' && !window.panelSetupDone) {
                setupPanel();
                window.panelSetupDone = true;
            }
          
            document.querySelectorAll('.username-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    playFeedback('light', 'click');
                    
                    const usernameElement = card.querySelector('.username');
                    if (usernameElement) {
                        const username = usernameElement.textContent.trim();
                        console.log('🔍 Card clicked - username:', username);
                        if (typeof showUsernamePanel === 'function') {
                            showUsernamePanel(username);
                        }
                    }
                });
            });
          
            const emptyMarket = document.querySelector('.empty-market');
            if (emptyMarket) {
                emptyMarket.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    playFeedback('light', 'click');
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
    
      const totalUsernames = userUsernames.length;
      const listedUsernames = userUsernames.filter(u => u.listed_status === 'listed').length;
    
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
            <div class="profile-actions" style="display: flex; gap: 10px; margin-bottom: 16px;">
                <button class="filter-btn apply" id="addUsernameBtn" style="flex: 2;">
                    <i class="fas fa-plus-circle"></i> ADD USERNAME
                </button>
                <button class="filter-btn reset" id="notificationsBtn" style="flex: 1;">
                    <i class="fas fa-bell"></i>
                    <span class="notification-badge" id="notificationBadge" style="display: none;">0</span>
                </button>
            </div>
    
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
                    <div class="profile-stats-compact">
                        <div class="profile-stats-row">
                            <div class="stat-item">
                                <i class="fas fa-tag"></i>
                                <span class="stat-value">${totalUsernames}</span>
                            </div>
                            <span class="stat-separator">/</span>
                            <div class="stat-item">
                                <i class="fas fa-check-circle" style="color: #10b981;"></i>
                                <span class="stat-value">${listedUsernames}</span>
                            </div>
                        </div>
                        <div class="listed-ratio">${listedUsernames}/${totalUsernames}</div>
                        <div class="listed-label">LISTED</div>
                    </div>
                </div>
            </div>
    
            <div class="profile-section-title">
                <i class="fas fa-tag"></i>
                <h3>Username Saya</h3>
            </div>
            ${usernamesHtml}
        `;
    
      // Tambahkan event listener untuk tombol add username
      document.getElementById('addUsernameBtn').addEventListener('click', () => {
        showAddUsernameModal();
      });
    
      // Tambahkan event listener untuk tombol notifikasi
      document.getElementById('notificationsBtn').addEventListener('click', () => {
        showNotificationsPanel();
      });
    
      // Load notifikasi pending
      loadPendingNotifications();
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
            
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                collapsibleState[sectionName] = !collapsibleState[sectionName];
                
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
        playFeedback('medium', 'pop');
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

        if (elements.filterClose) {
            elements.filterClose.addEventListener('click', toggleFilterPanel);
        }

        elements.filterPanel.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-panel-header') || 
                e.target.classList.contains('filter-panel-handle')) {
                toggleFilterPanel();
            }
        });

        if (elements.typeFilterChips) {
            elements.typeFilterChips.addEventListener('click', (e) => {
                const chip = e.target.closest('.chip');
                if (!chip) return;
                
                playFeedback('selection', 'click');
                
                const type = chip.dataset.type;
                if (!type) return;
                
                document.querySelectorAll('.chip[data-type]').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                filters.type = type;
            });
        }

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

        if (elements.sortBy) {
            elements.sortBy.addEventListener('change', (e) => {
                filters.sortBy = e.target.value;
            });
        }

        if (elements.resetFilters) {
            elements.resetFilters.addEventListener('click', () => {
                playFeedback('warning', 'pop');
                resetFilters();
                toggleFilterPanel();
            });
        }

        if (elements.applyFilters) {
            elements.applyFilters.addEventListener('click', () => {
                playFeedback('success', 'success');
                applyFilters();
                toggleFilterPanel();
            });
        }

        setupCollapsibleSections();
    }

    // ==================== NAVIGATION ====================
    function setupNavigation() {
        if (!elements.navItems.length) return;

        updateNavIndicator('market');

        elements.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                playFeedback('light', 'click');
                const page = item.dataset.page;
                if (!page) return;

                elements.navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                elements.pages.forEach(p => p.classList.remove('active'));
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

        const index = Array.from(elements.navItems).indexOf(activeItem);
        const itemWidth = 100 / elements.navItems.length;
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

        if (elements.scrollTopBtn) {
            elements.scrollTopBtn.addEventListener('click', () => {
                playFeedback('selection', 'pop');
                elements.marketMain.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    }

    // ==================== AUTO HAPTIC FOR ALL BUTTONS ====================
    function setupHapticForButtons() {
        const clickableElements = document.querySelectorAll('button, .nav-item, .chip, .filter-section-header, .filter-close, .search-clear-btn, .search-submit-btn, .filter-toggle-btn, .filter-btn, .scroll-top-btn, .user-profile-card');
      
        clickableElements.forEach(element => {
            element.addEventListener('click', (e) => {
                if (e.defaultPrevented) return;
                
                if (element.classList.contains('nav-item')) {
                    playFeedback('light', 'click');
                } else if (element.classList.contains('chip')) {
                    playFeedback('selection', 'click');
                } else if (element.classList.contains('filter-btn') || element.classList.contains('apply')) {
                    playFeedback('medium', 'pop');
                } else if (element.classList.contains('reset')) {
                    playFeedback('warning', 'pop');
                } else if (element.classList.contains('filter-close')) {
                    playFeedback('light', 'back');
                } else if (element.classList.contains('scroll-top-btn')) {
                    playFeedback('heavy', 'pop');
                } else {
                    playFeedback('light', 'click');
                }
            });
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
        
        if (elements.panelCloseBtn) {
            elements.panelCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playFeedback('light', 'back');
                hideUsernamePanel();
            });
        }
        
        if (elements.panelCartBtn) {
            elements.panelCartBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playFeedback('medium', 'click');
                showToast('Fitur keranjang akan segera hadir!', 'info');
            });
        }
        
        if (elements.panelBuyBtn) {
            elements.panelBuyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playFeedback('heavy', 'success');
            });
        }
        
        if (elements.panelOfferBtn) {
            elements.panelOfferBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playFeedback('medium', 'click');
            });
        }
        
        overlay.addEventListener('click', () => {
            hideUsernamePanel();
        });
        
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
            panelHandle.addEventListener('touchstart', handleTouchStart, { passive: false });
            panelHandle.addEventListener('touchmove', handleTouchMove, { passive: false });
            panelHandle.addEventListener('touchend', handleTouchEnd);
            panelHandle.addEventListener('touchcancel', () => {
                isDragging = false;
                elements.usernamePanel.style.transition = '';
                elements.usernamePanel.style.transform = '';
                overlay.style.opacity = '1';
            });
        }
        
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

    // ==================== NOTIFICATIONS ====================
    let pendingNotifications = [];
    let notificationsPanel = null;
    
    async function loadPendingNotifications() {
        try {
            const response = await fetchWithRetry(`${API_BASE_URL}/api/pending-requests/${currentUser.id}`, {
                method: 'GET'
            });
    
            pendingNotifications = response || [];
            updateNotificationBadge();
    
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
    
    function startNotificationPolling() {
        // Poll setiap 5 detik
        setInterval(() => {
            if (currentUser) {
                loadPendingNotifications();
            }
        }, 5000);
    }
    
    function updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        if (!badge) return;
    
        const count = pendingNotifications.length;
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
    
    function showNotificationsPanel() {
        if (notificationsPanel) {
            notificationsPanel.remove();
            notificationsPanel = null;
        }
    
        playFeedback('medium', 'pop');
    
        notificationsPanel = document.createElement('div');
        notificationsPanel.className = 'notifications-panel';
        notificationsPanel.id = 'notificationsPanel';
    
        let notificationsHtml = '';
    
        if (pendingNotifications.length === 0) {
            notificationsHtml = `
                <div class="empty-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>Tidak ada notifikasi pending</p>
                </div>
            `;
        } else {
            notificationsHtml = pendingNotifications.map(notif => {
                // Tentukan tipe notifikasi berdasarkan data yang ada
                const isChannel = notif.type === 'channel' || notif.username?.startsWith('channel_');
                const type = isChannel ? 'channel' : 'otp';
                const typeText = isChannel ? 'CHANNEL VERIFICATION' : 'OTP VERIFICATION';
                
                // Parsing data tambahan jika ada
                let additionalData = {};
                try {
                    if (notif.details) {
                        additionalData = JSON.parse(notif.details);
                    }
                } catch (e) {
                    // Jika bukan JSON, gunakan string biasa
                }
    
                return `
                    <div class="notification-item pending" data-id="${notif.id}" data-type="${type}" data-username="${notif.username}" data-details='${JSON.stringify(additionalData).replace(/'/g, "&apos;")}'>
                        <span class="notification-type ${type}">${typeText}</span>
                        <div class="notification-title">
                            <i class="fas fa-at"></i> @${notif.username}
                        </div>
                        <div class="notification-desc">
                            ${notif.details && typeof notif.details === 'string' && !notif.details.startsWith('{') ? notif.details : 'Menunggu verifikasi...'}
                        </div>
                        <div class="notification-meta">
                            <span><i class="fas fa-clock"></i> ${formatDate(notif.created_at)}</span>
                            <span><i class="fas fa-info-circle"></i> Klik untuk detail</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    
        notificationsPanel.innerHTML = `
            <div class="notifications-header">
                <h3>NOTIFIKASI PENDING</h3>
                <button class="notifications-close" id="closeNotifications">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notifications-list">
                ${notificationsHtml}
            </div>
        `;
    
        document.body.appendChild(notificationsPanel);
    
        setTimeout(() => {
            notificationsPanel.classList.add('show');
        }, 10);
    
        document.getElementById('closeNotifications').addEventListener('click', () => {
            notificationsPanel.classList.remove('show');
            setTimeout(() => {
                notificationsPanel.remove();
                notificationsPanel = null;
            }, 300);
        });
    
        // Event listener untuk setiap notifikasi
        notificationsPanel.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const type = item.dataset.type;
                const username = item.dataset.username;
                let details = {};
                try {
                    details = JSON.parse(item.dataset.details || '{}');
                } catch (e) {
                    details = {};
                }
                
                handleNotificationClick(id, type, username, details);
            });
        });
    
        // Klik di luar panel
        notificationsPanel.addEventListener('click', (e) => {
            if (e.target === notificationsPanel) {
                notificationsPanel.classList.remove('show');
                setTimeout(() => {
                    notificationsPanel.remove();
                    notificationsPanel = null;
                }, 300);
            }
        });
    }
    
    function handleNotificationClick(id, type, username, details) {
        playFeedback('light', 'click');
    
        if (type === 'otp') {
            showOtpDetailModal(id, username, details);
        } else {
            showChannelDetailModal(id, username, details);
        }
    }
    
    // MODAL UNTUK OTP VERIFICATION - DENGAN BORDER DAN DETAIL
    function showOtpDetailModal(requestId, username, details = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container" style="max-width: 450px;">
                <div class="modal-title">
                    <i class="fas fa-key" style="margin-right: 8px;"></i>
                    VERIFIKASI OTP
                </div>
                
                <!-- CARD DETAIL USER -->
                <div class="detail-card" style="background: rgba(0,0,0,0.3); border: 2px solid #40a7e3; border-radius: 16px; padding: 20px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 40px; background: linear-gradient(135deg, #40a7e3, #2d8bcb); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-user" style="color: white; font-size: 20px;"></i>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">USER DETAILS</div>
                            <div style="font-size: 18px; font-weight: 700; color: white;">@${username}</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- ID USER -->
                        <div style="display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                            <i class="fas fa-id-card" style="color: #40a7e3; width: 20px;"></i>
                            <span style="color: var(--text-muted); min-width: 80px;">User ID:</span>
                            <span style="color: white; font-weight: 600; font-family: monospace;">${details.user_id || details.owner_id || '-'}</span>
                        </div>
                        
                        <!-- USERNAME -->
                        <div style="display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                            <i class="fas fa-at" style="color: #40a7e3; width: 20px;"></i>
                            <span style="color: var(--text-muted); min-width: 80px;">Username:</span>
                            <span style="color: #40a7e3; font-weight: 600;">@${username}</span>
                        </div>
                        
                        <!-- STATUS -->
                        <div style="display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                            <i class="fas fa-clock" style="color: #f59e0b; width: 20px;"></i>
                            <span style="color: var(--text-muted); min-width: 80px;">Status:</span>
                            <span style="color: #f59e0b; font-weight: 600;">Menunggu OTP</span>
                        </div>
                    </div>
                </div>
                
                <!-- FORM INPUT OTP -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-lock" style="margin-right: 4px;"></i> MASUKKAN KODE OTP
                    </label>
                    <input type="text" class="modal-input" id="otpInput" placeholder="6 digit kode OTP" maxlength="6" autocomplete="off" style="text-align: center; font-size: 24px; letter-spacing: 8px; font-family: monospace;">
                </div>
                
                <div class="modal-actions">
                    <button class="modal-btn cancel" id="cancelOtp">
                        <i class="fas fa-times"></i> BATAL
                    </button>
                    <button class="modal-btn confirm" id="confirmOtp">
                        <i class="fas fa-check"></i> VERIFIKASI
                    </button>
                </div>
            </div>
        `;
    
        document.body.appendChild(modal);
    
        setTimeout(() => {
            modal.classList.add('show');
            document.getElementById('otpInput').focus();
        }, 10);
    
        document.getElementById('cancelOtp').addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });
    
        document.getElementById('confirmOtp').addEventListener('click', async () => {
            const otp = document.getElementById('otpInput').value.trim();
            if (!otp || otp.length !== 6) {
                showToast('Masukkan 6 digit kode OTP!', 'warning');
                return;
            }
    
            playFeedback('medium', 'pop');
    
            try {
                const response = await fetchWithRetry(`${API_BASE_URL}/api/verify-otp`, {
                    method: 'POST',
                    body: JSON.stringify({
                        request_id: requestId,
                        otp_code: otp,
                        user_id: currentUser.id
                    })
                });
    
                if (response.success) {
                    showToast('✅ Verifikasi berhasil! Username telah ditambahkan.', 'success');
                    modal.classList.remove('show');
                    setTimeout(() => modal.remove(), 300);
    
                    // Hapus notifikasi dari list
                    pendingNotifications = pendingNotifications.filter(n => n.id !== requestId);
                    updateNotificationBadge();
    
                    // Refresh panel jika masih terbuka
                    if (notificationsPanel) {
                        notificationsPanel.remove();
                        notificationsPanel = null;
                        showNotificationsPanel();
                    }
    
                    // Refresh data
                    loadMarketData();
                    loadUserUsernames();
                } else {
                    showToast(response.error || 'Kode OTP salah', 'error');
                }
            } catch (error) {
                console.error('Error verifying OTP:', error);
                showToast('Gagal verifikasi OTP', 'error');
            }
        });
    
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }
    
    // MODAL UNTUK CHANNEL VERIFICATION - DENGAN BORDER DAN DETAIL
    function showChannelDetailModal(requestId, username, details = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container" style="max-width: 450px;">
                <div class="modal-title">
                    <i class="fas fa-dragon" style="margin-right: 8px;"></i>
                    VERIFIKASI CHANNEL
                </div>
                
                <!-- CARD DETAIL CHANNEL -->
                <div class="detail-card" style="background: rgba(0,0,0,0.3); border: 2px solid #40a7e3; border-radius: 16px; padding: 20px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 40px; background: linear-gradient(135deg, #ff8c00, #ffbb33); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-dragon" style="color: white; font-size: 20px;"></i>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">CHANNEL DETAILS</div>
                            <div style="font-size: 18px; font-weight: 700; color: white;">@${username}</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- CHANNEL ID -->
                        <div style="display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                            <i class="fas fa-id-card" style="color: #ff8c00; width: 20px;"></i>
                            <span style="color: var(--text-muted); min-width: 100px;">Channel ID:</span>
                            <span style="color: white; font-weight: 600; font-family: monospace;">${details.channel_id || details.id || '-'}</span>
                        </div>
                        
                        <!-- CHANNEL USERNAME -->
                        <div style="display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                            <i class="fas fa-at" style="color: #ff8c00; width: 20px;"></i>
                            <span style="color: var(--text-muted); min-width: 100px;">Username:</span>
                            <span style="color: #ff8c00; font-weight: 600;">@${username}</span>
                        </div>
                        
                        <!-- OWNER INFO -->
                        <div style="display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                            <i class="fas fa-crown" style="color: #ffd700; width: 20px;"></i>
                            <span style="color: var(--text-muted); min-width: 100px;">Owner:</span>
                            <span style="color: #ffd700; font-weight: 600;">
                                ${details.creator_username ? `@${details.creator_username}` : (details.owner_username ? `@${details.owner_username}` : 'Belum diketahui')}
                            </span>
                        </div>
                        
                        <!-- OWNER ID -->
                        <div style="display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                            <i class="fas fa-id-card" style="color: #ffd700; width: 20px;"></i>
                            <span style="color: var(--text-muted); min-width: 100px;">Owner ID:</span>
                            <span style="color: white; font-weight: 600; font-family: monospace;">${details.creator_id || details.owner_id || '-'}</span>
                        </div>
                        
                        <!-- VERIFICATION TYPE -->
                        <div style="display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                            <i class="fas fa-shield-alt" style="color: ${details.creator_id ? '#10b981' : '#f59e0b'}; width: 20px;"></i>
                            <span style="color: var(--text-muted); min-width: 100px;">Verifikasi:</span>
                            <span style="color: ${details.creator_id ? '#10b981' : '#f59e0b'}; font-weight: 600;">
                                ${details.creator_id ? 'Owner Dikenali' : 'Verifikasi Admin'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- INFO TAMBAHAN -->
                <div style="background: rgba(0,0,0,0.2); border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 13px;">
                        <i class="fas fa-info-circle" style="color: #40a7e3;"></i>
                        <span>Pesan verifikasi telah dikirim ke channel. Owner/admin channel harus menekan tombol verifikasi di channel.</span>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="modal-btn cancel" id="closeChannelModal" style="width: 100%;">
                        <i class="fas fa-times"></i> TUTUP
                    </button>
                </div>
            </div>
        `;
    
        document.body.appendChild(modal);
    
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    
        document.getElementById('closeChannelModal').addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });
    
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }

    async function checkUsername(username) {
      try {
        console.log('🔍 Checking username:', username);
    
        // Bersihkan username (hapus @ jika ada)
        const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
    
        const response = await fetchWithRetry(`${API_BASE_URL}/api/bot/get-entity`, {
          method: 'POST',
          body: JSON.stringify({ username: cleanUsername })
        });
    
        console.log('✅ Check username response:', response);
    
        // Jika response.success false, tampilkan error yang lebih jelas
        if (!response.success) {
          let errorMessage = response.error || 'Username tidak ditemukan';
    
          // Handle berbagai tipe error
          if (errorMessage.includes('ENTITY_NOT_FOUND') || errorMessage.includes('not found')) {
            errorMessage = `Username @${cleanUsername} tidak ditemukan di Telegram. Pastikan username benar.`;
          } else if (errorMessage.includes('FLOOD_WAIT')) {
            errorMessage = 'Terlalu banyak permintaan. Silakan coba lagi nanti.';
          }
    
          return {
            success: false,
            error: errorMessage
          };
        }
    
        return response;
      } catch (error) {
        console.error('❌ Error checking username:', error);
    
        // Handle network errors
        if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
          return {
            success: false,
            error: 'Gagal terhubung ke server. Periksa koneksi internet Anda.'
          };
        }
    
        return {
          success: false,
          error: error.message || 'Terjadi kesalahan saat memeriksa username'
        };
      }
    }
    
    async function getChannelCreator(username, chatId) {
      try {
        const response = await fetchWithRetry(`${API_BASE_URL}/api/bot/get-channel-creator`, {
          method: 'POST',
          body: JSON.stringify({ username: username, chat_id: chatId })
        });
        return response;
      } catch (error) {
        console.error('Error getting channel creator:', error);
        return { success: false, error: error.message };
      }
    }
    
    async function requestUserVerification(username, userId) {
      try {
        const createSessionResponse = await fetchWithRetry(`${API_BASE_URL}/api/create-verification-session`, {
          method: 'POST',
          body: JSON.stringify({
            username: username,
            type: 'user',
            requester_id: currentUser.id
          })
        });
    
        if (!createSessionResponse.success) {
          return { success: false, error: createSessionResponse.error };
        }
    
        const sessionId = createSessionResponse.session_id;
        const otpCode = createSessionResponse.otp_code;
    
        const sendOtpResponse = await fetchWithRetry(`${API_BASE_URL}/api/bot/send-otp`, {
          method: 'POST',
          body: JSON.stringify({
            user_id: userId,
            username: username,
            otp_code: otpCode,
            requester_id: currentUser.id
          })
        });
    
        if (!sendOtpResponse.success) {
          return { success: false, error: sendOtpResponse.error };
        }
    
        showOtpInputModal(sessionId, username);
        return { success: true, session_id: sessionId };
    
      } catch (error) {
        console.error('Error requesting user verification:', error);
        return { success: false, error: error.message };
      }
    }
    
    async function requestChannelVerification(username, channelUsername, isAdminVerification = false) {
      try {
        const createSessionResponse = await fetchWithRetry(`${API_BASE_URL}/api/create-verification-session`, {
          method: 'POST',
          body: JSON.stringify({
            username: username,
            type: 'channel',
            requester_id: currentUser.id
          })
        });
    
        if (!createSessionResponse.success) {
          return { success: false, error: createSessionResponse.error };
        }
    
        const sessionId = createSessionResponse.session_id;
    
        const sendVerificationResponse = await fetchWithRetry(`${API_BASE_URL}/api/bot/send-channel-verification`, {
          method: 'POST',
          body: JSON.stringify({
            username: username,
            channel_username: channelUsername,
            requester_id: currentUser.id,
            requester_name: currentUser.first_name,
            verification_id: sessionId,
            is_admin_verification: isAdminVerification
          })
        });
    
        if (!sendVerificationResponse.success) {
          return { success: false, error: sendVerificationResponse.error };
        }
    
        showToast(`✅ Pesan verifikasi telah dikirim ke channel @${channelUsername}`, 'success');
        return { success: true, session_id: sessionId };
    
      } catch (error) {
        console.error('Error requesting channel verification:', error);
        return { success: false, error: error.message };
      }
    }
    
    function showOtpInputModal(sessionId, username) {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-title">MASUKKAN KODE OTP</div>
                <div style="text-align: center; margin-bottom: 16px;">
                    Kode OTP telah dikirim ke <strong>@${username}</strong>
                </div>
                <input type="text" class="modal-input" id="otpInput" placeholder="6 digit kode OTP" maxlength="6" autocomplete="off">
                <div class="modal-actions">
                    <button class="modal-btn cancel" id="cancelOtp">
                        <i class="fas fa-times"></i> BATAL
                    </button>
                    <button class="modal-btn confirm" id="confirmOtp">
                        <i class="fas fa-check"></i> VERIFIKASI
                    </button>
                </div>
            </div>
        `;
    
      document.body.appendChild(modal);
    
      setTimeout(() => {
        modal.classList.add('show');
        document.getElementById('otpInput').focus();
      }, 10);
    
      document.getElementById('cancelOtp').addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
      });
    
      document.getElementById('confirmOtp').addEventListener('click', async () => {
        const otp = document.getElementById('otpInput').value.trim();
        if (!otp || otp.length !== 6) {
          showToast('Masukkan 6 digit kode OTP!', 'warning');
          return;
        }
    
        playFeedback('medium', 'pop');
    
        try {
          // Verifikasi OTP via endpoint di app.py
          const response = await fetchWithRetry(`${API_BASE_URL}/api/verify-otp`, {
            method: 'POST',
            body: JSON.stringify({
              request_id: sessionId,
              otp_code: otp,
              user_id: currentUser.id
            })
          });
    
          if (response.success) {
            showToast('✅ Verifikasi berhasil! Username telah ditambahkan.', 'success');
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
    
            // Refresh data
            loadMarketData();
            loadUserUsernames();
          } else {
            showToast(response.error || 'Kode OTP salah', 'error');
          }
        } catch (error) {
          console.error('Error verifying OTP:', error);
          showToast('Gagal verifikasi OTP', 'error');
        }
      });
    
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
          setTimeout(() => modal.remove(), 300);
        }
      });
    }

    // MODAL ADD USERNAME - DENGAN TAMPILAN LEBIH BAIK
    function showAddUsernameModal() {
        const oldModal = document.getElementById('addUsernameModal');
        if (oldModal) oldModal.remove();
    
        const modal = document.createElement('div');
        modal.id = 'addUsernameModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-title">
                    <i class="fas fa-plus-circle"></i>
                    ADD USERNAME
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-at"></i> USERNAME TELEGRAM
                    </label>
                    <input type="text" class="modal-input" id="usernameInput" placeholder="@username" autocomplete="off">
                </div>
                
                <div class="modal-actions">
                    <button class="modal-btn cancel" id="cancelAddUsername">
                        <i class="fas fa-times"></i> BATAL
                    </button>
                    <button class="modal-btn confirm" id="confirmAddUsername">
                        <i class="fas fa-check"></i> VERIFIKASI
                    </button>
                </div>
                
                <div id="usernameCheckResult" style="margin-top: 20px; display: none;"></div>
            </div>
        `;
    
        document.body.appendChild(modal);
    
        setTimeout(() => {
            modal.classList.add('show');
            document.getElementById('usernameInput').focus();
        }, 10);
    
        document.getElementById('cancelAddUsername').addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
            playFeedback('light', 'back');
        });
    
        document.getElementById('confirmAddUsername').addEventListener('click', async () => {
            const username = document.getElementById('usernameInput').value.trim();
            if (!username) {
                showToast('Masukkan username!', 'warning');
                return;
            }
    
            if (!username.startsWith('@')) {
                showToast('Username harus diawali dengan @', 'warning');
                return;
            }
    
            playFeedback('medium', 'pop');
    
            const confirmBtn = document.getElementById('confirmAddUsername');
            const originalText = confirmBtn.innerHTML;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MENGECEK...';
            confirmBtn.disabled = true;
    
            try {
                // Cek entity via bot API (PERBAIKAN: hapus /proxy/)
                const result = await checkUsername(username);
                
                if (!result.success) {
                    showToast(result.error || 'Username tidak ditemukan!', 'error');
                    return;
                }
                
                // Tampilkan hasil pengecekan
                const resultDiv = document.getElementById('usernameCheckResult');
                resultDiv.style.display = 'block';
                
                if (result.type === 'user') {
                    // Cek apakah user sudah menggunakan bot
                    const userCheck = await fetchWithRetry(`${API_BASE_URL}/api/check-user-exists`, {
                        method: 'POST',
                        body: JSON.stringify({ username: result.username })
                    });
                    
                    if (!userCheck.exists) {
                        resultDiv.innerHTML = `
                            <div style="background: rgba(239, 68, 68, 0.15); border: 2px solid #ef4444; border-radius: 16px; padding: 20px;">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                    <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 24px;"></i>
                                    <strong style="color: #ef4444; font-size: 16px;">User Belum Menggunakan Bot!</strong>
                                </div>
                                <p style="color: var(--text-muted); margin-bottom: 12px;">User @${result.username} harus memulai bot @indotag_bot terlebih dahulu.</p>
                                <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 12px;">
                                    <code style="color: #40a7e3;">@${result.username}</code>
                                </div>
                            </div>
                        `;
                    } else {
                        resultDiv.innerHTML = `
                            <div style="background: rgba(16, 185, 129, 0.15); border: 2px solid #10b981; border-radius: 16px; padding: 20px;">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                                    <i class="fas fa-check-circle" style="color: #10b981; font-size: 24px;"></i>
                                    <strong style="color: #10b981; font-size: 16px;">User Ditemukan!</strong>
                                </div>
                                
                                <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                        <i class="fas fa-id-card" style="color: #40a7e3; width: 20px;"></i>
                                        <span style="color: var(--text-muted);">User ID:</span>
                                        <span style="color: white; font-family: monospace;">${result.id}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <i class="fas fa-at" style="color: #40a7e3; width: 20px;"></i>
                                        <span style="color: var(--text-muted);">Username:</span>
                                        <span style="color: #40a7e3;">@${result.username}</span>
                                    </div>
                                </div>
                                
                                <button class="filter-btn apply" style="width: 100%;" id="requestUserVerificationBtn">
                                    <i class="fas fa-paper-plane"></i> MINTA VERIFIKASI
                                </button>
                            </div>
                        `;
                        
                        document.getElementById('requestUserVerificationBtn').addEventListener('click', async () => {
                            await requestUserVerification(result.username, result.id);
                            modal.classList.remove('show');
                            setTimeout(() => modal.remove(), 300);
                        });
                    }
                } else if (result.type === 'channel') {
                    // Cek creator channel
                    const creatorResult = await getChannelCreator(username, result.id);
                    
                    resultDiv.innerHTML = `
                        <div style="background: rgba(64, 167, 227, 0.15); border: 2px solid #40a7e3; border-radius: 16px; padding: 20px;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                                <i class="fas fa-dragon" style="color: #40a7e3; font-size: 24px;"></i>
                                <strong style="color: #40a7e3; font-size: 16px;">Channel Ditemukan!</strong>
                            </div>
                            
                            <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <i class="fas fa-id-card" style="color: #40a7e3; width: 20px;"></i>
                                    <span style="color: var(--text-muted);">Channel ID:</span>
                                    <span style="color: white; font-family: monospace;">${result.id}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <i class="fas fa-at" style="color: #40a7e3; width: 20px;"></i>
                                    <span style="color: var(--text-muted);">Username:</span>
                                    <span style="color: #40a7e3;">@${result.username}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px; ${!creatorResult.creator_id ? 'opacity: 0.7;' : ''}">
                                    <i class="fas fa-crown" style="color: #ffd700; width: 20px;"></i>
                                    <span style="color: var(--text-muted);">Creator:</span>
                                    <span style="color: #ffd700;">
                                        ${creatorResult.creator_username ? `@${creatorResult.creator_username}` : 'Tidak terdeteksi'}
                                    </span>
                                </div>
                            </div>
                            
                            ${!creatorResult.creator_id ? `
                                <div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 16px; border-radius: 8px;">
                                    <i class="fas fa-info-circle" style="color: #f59e0b; margin-right: 8px;"></i>
                                    <span style="color: var(--text-muted); font-size: 13px;">Creator tidak terdeteksi. Verifikasi sebagai admin akan dilakukan.</span>
                                </div>
                            ` : ''}
                            
                            <button class="filter-btn apply" style="width: 100%;" id="requestChannelVerificationBtn">
                                <i class="fas fa-paper-plane"></i> KIRIM VERIFIKASI KE CHANNEL
                            </button>
                        </div>
                    `;
                    
                    document.getElementById('requestChannelVerificationBtn').addEventListener('click', async () => {
                        await requestChannelVerification(result.username, result.username, !creatorResult.creator_id);
                        modal.classList.remove('show');
                        setTimeout(() => modal.remove(), 300);
                    });
                }
                
            } catch (error) {
                console.error('Error:', error);
                showToast('Gagal memproses username', 'error');
            } finally {
                confirmBtn.innerHTML = originalText;
                confirmBtn.disabled = false;
            }
        });
    
        document.getElementById('usernameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('confirmAddUsername').click();
            }
        });
    
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }
    
    function handleNotificationClick(id, type) {
      playFeedback('light', 'click');
    
      if (type === 'otp') {
        showOtpInputModal(id);
      } else {
        showChannelVerificationModal(id);
      }
    }
    
    function showOtpInputModal(requestId) {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-title">MASUKKAN KODE OTP</div>
                <input type="text" class="modal-input" id="otpInput" placeholder="6 digit kode OTP" maxlength="6" autocomplete="off">
                <div class="modal-actions">
                    <button class="modal-btn cancel" id="cancelOtp">
                        <i class="fas fa-times"></i> BATAL
                    </button>
                    <button class="modal-btn confirm" id="confirmOtp">
                        <i class="fas fa-check"></i> VERIFIKASI
                    </button>
                </div>
            </div>
        `;
    
      document.body.appendChild(modal);
    
      setTimeout(() => {
        modal.classList.add('show');
        document.getElementById('otpInput').focus();
      }, 10);
    
      document.getElementById('cancelOtp').addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
      });
    
      document.getElementById('confirmOtp').addEventListener('click', async () => {
        const otp = document.getElementById('otpInput').value.trim();
        if (!otp || otp.length !== 6) {
          showToast('Masukkan 6 digit kode OTP!', 'warning');
          return;
        }
    
        playFeedback('medium', 'pop');
    
        try {
          const response = await fetchWithRetry(`${API_BASE_URL}/api/verify-otp`, {
            method: 'POST',
            body: JSON.stringify({
              request_id: requestId,
              otp_code: otp,
              user_id: currentUser.id
            })
          });
    
          if (response.success) {
            showToast('Verifikasi berhasil!', 'success');
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
    
            // Hapus notifikasi dari list
            pendingNotifications = pendingNotifications.filter(n => n.id !== requestId);
            updateNotificationBadge();
    
            // Refresh panel jika masih terbuka
            if (notificationsPanel) {
              notificationsPanel.remove();
              notificationsPanel = null;
              showNotificationsPanel();
            }
    
            // Refresh data market
            loadMarketData();
          } else {
            showToast(response.error || 'Kode OTP salah', 'error');
          }
        } catch (error) {
          console.error('Error verifying OTP:', error);
          showToast('Gagal verifikasi OTP', 'error');
        }
      });
    
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
          setTimeout(() => modal.remove(), 300);
        }
      });
    }
    
    function showChannelVerificationModal(requestId) {
      const request = pendingNotifications.find(n => n.id === requestId);
      if (!request) return;
    
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-title">VERIFIKASI CHANNEL</div>
                <div style="background: rgba(0,0,0,0.3); border-radius: 16px; padding: 16px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <i class="fas fa-dragon" style="color: var(--primary-color); font-size: 24px;"></i>
                        <div style="font-weight: 700; font-size: 16px;">@${request.username}</div>
                    </div>
                    <div style="display: flex; gap: 12px; font-size: 13px; color: var(--text-muted);">
                        <span><i class="fas fa-hashtag"></i> ID: ${request.chat_id || '-'}</span>
                        <span><i class="fas fa-users"></i> Owner: @${request.owner_username || 'unknown'}</span>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="modal-btn cancel" id="closeChannelModal">
                        <i class="fas fa-times"></i> TUTUP
                    </button>
                </div>
            </div>
        `;
    
      document.body.appendChild(modal);
    
      setTimeout(() => {
        modal.classList.add('show');
      }, 10);
    
      document.getElementById('closeChannelModal').addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
      });
    
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
          setTimeout(() => modal.remove(), 300);
        }
      });
    }

    // MODAL ADD USERNAME - DENGAN TAMPILAN LEBIH BAIK
    function showAddUsernameModal() {
        const oldModal = document.getElementById('addUsernameModal');
        if (oldModal) oldModal.remove();
    
        const modal = document.createElement('div');
        modal.id = 'addUsernameModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-title">
                    <i class="fas fa-plus-circle"></i>
                    ADD USERNAME
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-at"></i> USERNAME TELEGRAM
                    </label>
                    <input type="text" class="modal-input" id="usernameInput" placeholder="@username" autocomplete="off">
                </div>
                
                <div class="modal-actions">
                    <button class="modal-btn cancel" id="cancelAddUsername">
                        <i class="fas fa-times"></i> BATAL
                    </button>
                    <button class="modal-btn confirm" id="confirmAddUsername">
                        <i class="fas fa-check"></i> CEK USERNAME
                    </button>
                </div>
                
                <div id="usernameCheckResult" style="margin-top: 20px; display: none;"></div>
            </div>
        `;
    
        document.body.appendChild(modal);
    
        setTimeout(() => {
            modal.classList.add('show');
            document.getElementById('usernameInput').focus();
        }, 10);
    
        document.getElementById('cancelAddUsername').addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
            playFeedback('light', 'back');
        });
    
        document.getElementById('confirmAddUsername').addEventListener('click', async () => {
            const username = document.getElementById('usernameInput').value.trim();
            if (!username) {
                showToast('Masukkan username!', 'warning');
                return;
            }
    
            if (!username.startsWith('@')) {
                showToast('Username harus diawali dengan @', 'warning');
                return;
            }
    
            playFeedback('medium', 'pop');
    
            const confirmBtn = document.getElementById('confirmAddUsername');
            const originalText = confirmBtn.innerHTML;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MENGECEK...';
            confirmBtn.disabled = true;
    
            const resultDiv = document.getElementById('usernameCheckResult');
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div class="loading-spinner" style="width: 40px; height: 40px; margin: 0 auto 16px;"></div>
                    <p style="color: var(--text-muted);">Memeriksa username @${username.replace('@', '')}...</p>
                </div>
            `;
    
            try {
                console.log('🔍 Memeriksa username:', username);
                
                // Cek entity via bot API
                const result = await checkUsername(username);
                
                console.log('📦 Hasil pengecekan:', result);
                
                if (!result.success) {
                    // Tampilkan error dengan styling yang lebih baik
                    resultDiv.innerHTML = `
                        <div style="background: rgba(239, 68, 68, 0.15); border: 2px solid #ef4444; border-radius: 16px; padding: 24px; text-align: center;">
                            <i class="fas fa-exclamation-circle" style="color: #ef4444; font-size: 48px; margin-bottom: 16px;"></i>
                            <h3 style="color: #ef4444; margin-bottom: 12px; font-size: 18px;">Username Tidak Ditemukan!</h3>
                            <p style="color: var(--text-muted); margin-bottom: 20px; font-size: 14px;">${result.error || 'Username tidak valid'}</p>
                            <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 12px; margin-bottom: 20px;">
                                <code style="color: #ef4444; font-size: 14px;">${username}</code>
                            </div>
                            <button class="filter-btn reset" id="closeErrorBtn" style="width: 100%;">
                                <i class="fas fa-times"></i> TUTUP
                            </button>
                        </div>
                    `;
                    
                    document.getElementById('closeErrorBtn').addEventListener('click', () => {
                        modal.classList.remove('show');
                        setTimeout(() => modal.remove(), 300);
                    });
                    
                    showToast(result.error || 'Username tidak ditemukan!', 'error');
                    return;
                }
                
                // Tampilkan hasil pengecekan berdasarkan tipe
                if (result.type === 'user') {
                    // Cek apakah user sudah menggunakan bot
                    const userCheck = await fetchWithRetry(`${API_BASE_URL}/api/check-user-exists`, {
                        method: 'POST',
                        body: JSON.stringify({ username: result.username })
                    });
                    
                    if (!userCheck.exists) {
                        resultDiv.innerHTML = `
                            <div style="background: rgba(239, 68, 68, 0.15); border: 2px solid #ef4444; border-radius: 16px; padding: 20px;">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                                    <div style="width: 40px; height: 40px; border-radius: 40px; background: rgba(239,68,68,0.2); display: flex; align-items: center; justify-content: center;">
                                        <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 20px;"></i>
                                    </div>
                                    <div>
                                        <div style="font-size: 12px; color: var(--text-muted);">STATUS</div>
                                        <div style="font-size: 16px; font-weight: 700; color: #ef4444;">User Belum Menggunakan Bot</div>
                                    </div>
                                </div>
                                
                                <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                        <i class="fas fa-id-card" style="color: #40a7e3; width: 20px;"></i>
                                        <span style="color: var(--text-muted);">User ID:</span>
                                        <span style="color: white; font-family: monospace;">${result.id}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <i class="fas fa-at" style="color: #40a7e3; width: 20px;"></i>
                                        <span style="color: var(--text-muted);">Username:</span>
                                        <span style="color: #40a7e3;">@${result.username}</span>
                                    </div>
                                </div>
                                
                                <div style="background: rgba(239,68,68,0.1); border-left: 4px solid #ef4444; padding: 12px; margin-bottom: 16px; border-radius: 8px;">
                                    <i class="fas fa-info-circle" style="color: #ef4444; margin-right: 8px;"></i>
                                    <span style="color: var(--text-muted); font-size: 13px;">User @${result.username} harus memulai bot @indotag_bot terlebih dahulu.</span>
                                </div>
                                
                                <button class="filter-btn reset" id="closeUserErrorBtn" style="width: 100%;">
                                    <i class="fas fa-times"></i> TUTUP
                                </button>
                            </div>
                        `;
                        
                        document.getElementById('closeUserErrorBtn').addEventListener('click', () => {
                            modal.classList.remove('show');
                            setTimeout(() => modal.remove(), 300);
                        });
                        
                    } else {
                        resultDiv.innerHTML = `
                            <div style="background: rgba(16, 185, 129, 0.15); border: 2px solid #10b981; border-radius: 16px; padding: 20px;">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                                    <div style="width: 40px; height: 40px; border-radius: 40px; background: rgba(16,185,129,0.2); display: flex; align-items: center; justify-content: center;">
                                        <i class="fas fa-check-circle" style="color: #10b981; font-size: 20px;"></i>
                                    </div>
                                    <div>
                                        <div style="font-size: 12px; color: var(--text-muted);">STATUS</div>
                                        <div style="font-size: 16px; font-weight: 700; color: #10b981;">User Ditemukan!</div>
                                    </div>
                                </div>
                                
                                <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                        <i class="fas fa-id-card" style="color: #40a7e3; width: 20px;"></i>
                                        <span style="color: var(--text-muted);">User ID:</span>
                                        <span style="color: white; font-family: monospace;">${result.id}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <i class="fas fa-at" style="color: #40a7e3; width: 20px;"></i>
                                        <span style="color: var(--text-muted);">Username:</span>
                                        <span style="color: #40a7e3;">@${result.username}</span>
                                    </div>
                                </div>
                                
                                <button class="filter-btn apply" style="width: 100%;" id="requestUserVerificationBtn">
                                    <i class="fas fa-paper-plane"></i> MINTA VERIFIKASI
                                </button>
                            </div>
                        `;
                        
                        document.getElementById('requestUserVerificationBtn').addEventListener('click', async () => {
                            await requestUserVerification(result.username, result.id);
                            modal.classList.remove('show');
                            setTimeout(() => modal.remove(), 300);
                        });
                    }
                    
                } else if (result.type === 'channel') {
                    // Cek creator channel
                    const creatorResult = await getChannelCreator(username, result.id);
                    
                    // Tentukan status verifikasi
                    const hasCreator = creatorResult.success && creatorResult.creator_id;
                    const statusColor = hasCreator ? '#10b981' : '#f59e0b';
                    const statusText = hasCreator ? 'Owner Terdeteksi' : 'Verifikasi Admin';
                    const statusIcon = hasCreator ? 'fa-crown' : 'fa-shield-alt';
                    
                    resultDiv.innerHTML = `
                        <div style="background: rgba(64, 167, 227, 0.15); border: 2px solid #40a7e3; border-radius: 16px; padding: 20px;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                                <div style="width: 40px; height: 40px; border-radius: 40px; background: rgba(64,167,227,0.2); display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-dragon" style="color: #40a7e3; font-size: 20px;"></i>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted);">STATUS</div>
                                    <div style="font-size: 16px; font-weight: 700; color: #40a7e3;">Channel Ditemukan!</div>
                                </div>
                            </div>
                            
                            <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <i class="fas fa-id-card" style="color: #40a7e3; width: 20px;"></i>
                                    <span style="color: var(--text-muted);">Channel ID:</span>
                                    <span style="color: white; font-family: monospace;">${result.id}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <i class="fas fa-at" style="color: #40a7e3; width: 20px;"></i>
                                    <span style="color: var(--text-muted);">Username:</span>
                                    <span style="color: #40a7e3;">@${result.username}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <i class="fas ${statusIcon}" style="color: ${statusColor}; width: 20px;"></i>
                                    <span style="color: var(--text-muted);">Creator:</span>
                                    <span style="color: ${statusColor}; font-weight: 600;">
                                        ${hasCreator ? `@${creatorResult.creator_username || 'unknown'}` : 'Tidak terdeteksi'}
                                    </span>
                                </div>
                                ${hasCreator ? `
                                <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
                                    <i class="fas fa-id-card" style="color: #ffd700; width: 20px;"></i>
                                    <span style="color: var(--text-muted);">Creator ID:</span>
                                    <span style="color: white; font-family: monospace;">${creatorResult.creator_id}</span>
                                </div>
                                ` : ''}
                            </div>
                            
                            ${!hasCreator ? `
                                <div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 16px; border-radius: 8px;">
                                    <i class="fas fa-info-circle" style="color: #f59e0b; margin-right: 8px;"></i>
                                    <span style="color: var(--text-muted); font-size: 13px;">Creator tidak terdeteksi. Verifikasi sebagai admin akan dilakukan.</span>
                                </div>
                            ` : ''}
                            
                            <button class="filter-btn apply" style="width: 100%;" id="requestChannelVerificationBtn">
                                <i class="fas fa-paper-plane"></i> KIRIM VERIFIKASI KE CHANNEL
                            </button>
                        </div>
                    `;
                    
                    document.getElementById('requestChannelVerificationBtn').addEventListener('click', async () => {
                        await requestChannelVerification(result.username, result.username, !hasCreator);
                        modal.classList.remove('show');
                        setTimeout(() => modal.remove(), 300);
                    });
                }
                
            } catch (error) {
                console.error('❌ Fatal error:', error);
                resultDiv.innerHTML = `
                    <div style="background: rgba(239, 68, 68, 0.15); border: 2px solid #ef4444; border-radius: 16px; padding: 20px; text-align: center;">
                        <i class="fas fa-bug" style="color: #ef4444; font-size: 48px; margin-bottom: 16px;"></i>
                        <h3 style="color: #ef4444; margin-bottom: 12px; font-size: 18px;">Terjadi Kesalahan!</h3>
                        <p style="color: var(--text-muted); margin-bottom: 20px; font-size: 14px;">${error.message || 'Silakan coba lagi nanti'}</p>
                        <button class="filter-btn reset" id="closeFatalErrorBtn" style="width: 100%;">
                            <i class="fas fa-times"></i> TUTUP
                        </button>
                    </div>
                `;
                
                document.getElementById('closeFatalErrorBtn').addEventListener('click', () => {
                    modal.classList.remove('show');
                    setTimeout(() => modal.remove(), 300);
                });
                
                showToast('Gagal memproses username: ' + error.message, 'error');
                
            } finally {
                confirmBtn.innerHTML = originalText;
                confirmBtn.disabled = false;
            }
        });
    
        document.getElementById('usernameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('confirmAddUsername').click();
            }
        });
    
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }

    // ==================== SAFE AREA HANDLING ====================
    
    function updateSafeAreaInsets() {
      if (!window.Telegram?.WebApp) {
        console.warn('⚠️ Telegram WebApp not available');
        return;
      }
    
      const webApp = window.Telegram.WebApp;
    
      // Log semua properti yang tersedia
      console.log('📱 WebApp Object:', {
        version: webApp.version,
        isFullscreen: webApp.isFullscreen,
        safeAreaInset: webApp.safeAreaInset,
        contentSafeAreaInset: webApp.contentSafeAreaInset
      });
    
      // Dapatkan nilai safe area dengan default 0
      const safeArea = webApp.safeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 };
      const contentSafeArea = webApp.contentSafeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 };
    
      console.log('📐 Safe Area Values:', {
        safeAreaTop: safeArea.top,
        safeAreaBottom: safeArea.bottom,
        contentSafeAreaTop: contentSafeArea.top,
        contentSafeAreaBottom: contentSafeArea.bottom
      });
    
      // Hitung tinggi header baru (80px + safeArea.top)
      const headerTotalHeight = 80 + (safeArea.top || 0);
    
      console.log('📏 Header height will be:', headerTotalHeight, 'px (80px +', safeArea.top, 'px)');
    
      // Update CSS variables
      document.documentElement.style.setProperty('--safe-area-top', `${safeArea.top}px`);
      document.documentElement.style.setProperty('--safe-area-bottom', `${safeArea.bottom}px`);
      document.documentElement.style.setProperty('--safe-area-left', `${safeArea.left}px`);
      document.documentElement.style.setProperty('--safe-area-right', `${safeArea.right}px`);
    
      document.documentElement.style.setProperty('--content-safe-area-top', `${contentSafeArea.top}px`);
      document.documentElement.style.setProperty('--content-safe-area-bottom', `${contentSafeArea.bottom}px`);
    
      // Set tinggi header total
      document.documentElement.style.setProperty('--header-total-height', `${headerTotalHeight}px`);
    
      // Update header height secara langsung juga
      const header = document.querySelector('.market-header');
      if (header) {
        header.style.height = `${headerTotalHeight}px`;
        header.style.paddingTop = `${safeArea.top || 0}px`;
        console.log('✅ Header height updated to:', headerTotalHeight, 'px');
      } else {
        console.warn('⚠️ Header element not found');
      }
    
      // Update main content padding top
      const marketMain = document.getElementById('marketMain');
      if (marketMain) {
        marketMain.style.paddingTop = `calc(20px + ${contentSafeArea.top || 0}px)`;
      }
    
      // Update bottom navigation position
      const bottomNav = document.getElementById('bottomNav');
      if (bottomNav) {
        bottomNav.style.bottom = `calc(16px + ${safeArea.bottom || 0}px)`;
      }
    
      // Update scroll to top button position
      const scrollTopBtn = document.getElementById('scrollTopBtn');
      if (scrollTopBtn) {
        scrollTopBtn.style.bottom = `calc(90px + ${safeArea.bottom || 0}px)`;
      }
    
      // Update toast container position
      const toastContainer = document.getElementById('toastContainer');
      if (toastContainer) {
        toastContainer.style.bottom = `calc(90px + ${safeArea.bottom || 0}px)`;
      }
    }
    
    // Panggil fungsi ini saat:
    // 1. Setelah WebApp ready
    // 2. Saat event safeAreaChanged
    function setupSafeAreaHandling() {
      if (!window.Telegram?.WebApp) return;
    
      const webApp = window.Telegram.WebApp;
    
      // Update initial safe area
      updateSafeAreaInsets();
    
      // Listen for safe area changes
      webApp.onEvent('safeAreaChanged', () => {
        console.log('🔄 Safe area changed');
        updateSafeAreaInsets();
      });
    
      webApp.onEvent('contentSafeAreaChanged', () => {
        console.log('🔄 Content safe area changed');
        updateSafeAreaInsets();
      });
    
      // Also update when fullscreen changes
      webApp.onEvent('fullscreenChanged', () => {
        console.log('🔄 Fullscreen changed, updating safe area');
        setTimeout(updateSafeAreaInsets, 100); // Small delay for transition
      });
    }

    // ==================== INITIALIZATION ====================
    async function init() {
        showLoading(true);
      
        try {
            console.log('📳 Initializing haptic feedback...');
            
            // Inisialisasi AudioManager dengan Howler.js
            if (window.AudioManager) {
                // Delay sedikit agar Howler.js siap
                setTimeout(() => {
                    window.AudioManager.init();
                }, 100);
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
            startNotificationPolling();
      
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
              // 1. Expand dan ready
              window.Telegram.WebApp.expand();
              window.Telegram.WebApp.ready();
              console.log('📱 Telegram WebApp version:', window.Telegram.WebApp.version);
            
              // 2. Setup safe area handling (langsung setelah ready)
              setupSafeAreaHandling();
            
              // 3. Cek fullscreen support
              if (window.Telegram.WebApp.isVersionAtLeast('8.0')) {
                setTimeout(() => {
                  try {
                    window.Telegram.WebApp.requestFullscreen();
                    console.log('✅ Fullscreen requested');
                  } catch (e) {
                    console.warn('⚠️ Fullscreen request failed:', e);
                  }
                }, 500);
            
                // Pantau perubahan fullscreen
                window.Telegram.WebApp.onEvent('fullscreenChanged', () => {
                  console.log('🔄 Fullscreen changed:', window.Telegram.WebApp.isFullscreen);
                });
            
                window.Telegram.WebApp.onEvent('fullscreenFailed', () => {
                  console.warn('❌ Fullscreen failed');
                });
              } else {
                console.log('ℹ️ Fullscreen not supported');
              }
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