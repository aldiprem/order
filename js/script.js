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

    // ==================== HAPTIC FEEDBACK TELEGRAM (VERSI DIPERBAIKI) ====================
    let telegramHaptic = null;
    
    function initHaptic() {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        telegramHaptic = window.Telegram.WebApp.HapticFeedback;
        console.log('✅ Haptic feedback initialized');
        return true;
      } else {
        console.log('⚠️ Haptic feedback not available');
        return false;
      }
    }
    
    function hapticImpact(style = 'medium') {
      if (!telegramHaptic) {
        // Coba inisialisasi ulang
        if (!initHaptic()) return;
      }
    
      try {
        telegramHaptic.impactOccurred(style);
        console.log(`📳 Haptic impact: ${style}`);
      } catch (e) {
        console.log('Haptic impact error:', e);
      }
    }
    
    function hapticNotification(type = 'success') {
      if (!telegramHaptic) {
        if (!initHaptic()) return;
      }
    
      try {
        telegramHaptic.notificationOccurred(type);
        console.log(`📳 Haptic notification: ${type}`);
      } catch (e) {
        console.log('Haptic notification error:', e);
      }
    }
    
    function hapticSelection() {
      if (!telegramHaptic) {
        if (!initHaptic()) return;
      }
    
      try {
        telegramHaptic.selectionChanged();
        console.log(`📳 Haptic selection changed`);
      } catch (e) {
        console.log('Haptic selection error:', e);
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
    
      // PINDAHKAN KE SINI - setelah elemen dibuat
      const userProfileCard = document.querySelector('.user-profile-card');
      if (userProfileCard) {
        userProfileCard.addEventListener('click', () => {
          hapticFeedback('light');
          document.querySelector('.nav-item[data-page="profile"]')?.click();
        });
      }
    }

    // ==================== DATA LOADING ====================
    async function loadMarketData() {
      showLoading(true);
      hapticFeedback('medium');
    
      try {
        const usernames = await fetchWithRetry(`${API_BASE_URL}/api/market`, {
          method: 'GET'
        });
    
        allUsernames = usernames || [];
    
        // TIDAK PERLU hitung ulang karena shape sudah dari database
        // allUsernames.forEach(u => {
        //     u.username_type = determineUsernameType(u.username, u.based_on);
        // });
    
        applyFilters();
        hapticFeedback('success');
      } catch (error) {
        console.error('Error loading market data:', error);
        showToast('Gagal memuat data market', 'error');
        hapticFeedback('error');
        allUsernames = [];
      } finally {
        showLoading(false);
      }
    }

    // ==================== ACTIVITY FUNCTIONS (All Users) ====================
    async function loadActivities() {
        const activityPage = document.getElementById('activityPage');
        if (!activityPage) return;
        
        // Show skeleton loading immediately
        renderActivitySkeleton();
        
        isLoadingActivities = true;

        try {
            // Get activities for all users
            // Note: You need to create a new endpoint in app.py for this
            // For now, we'll use the existing endpoint but with a different approach
            let response;
            try {
                // Try to get all activities from a new endpoint
                response = await fetchWithRetry(`${API_BASE_URL}/api/activities/all`, {
                    method: 'GET'
                });
            } catch (error) {
                console.log('Activities all endpoint not available');
                // If endpoint doesn't exist, just set empty array
                response = [];
            }

            if (response && Array.isArray(response)) {
                // Filter only username-related activities (exclude USER_START)
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

    function determineUsernameType(username, basedOn) {
        if (!basedOn) return 'UNCOMMON';

        const usernameLower = username.toLowerCase();
        const basedOnLower = basedOn.toLowerCase();

        if (usernameLower === basedOnLower) return 'OP';
        if (usernameLower === basedOnLower + 's') return 'SCANON';

        for (let i = 0; i < basedOnLower.length - 1; i++) {
            if (basedOnLower[i] === basedOnLower[i + 1]) {
                if (usernameLower === basedOnLower.slice(0, i + 1) + basedOnLower.slice(i + 1)) {
                    return 'SOP';
                }
            }
        }

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

        if (usernameLower.length === basedOnLower.length + 1) {
            if (usernameLower.startsWith(basedOnLower) || usernameLower.endsWith(basedOnLower)) {
                return 'TAMPING';
            }
        }

        if (usernameLower.length === basedOnLower.length + 1) {
            for (let i = 0; i < basedOnLower.length; i++) {
                if (usernameLower.startsWith(basedOnLower.slice(0, i)) && 
                    usernameLower.slice(i + 1).startsWith(basedOnLower.slice(i))) {
                    return 'TAMDAL';
                }
            }
        }

        if (usernameLower.length === basedOnLower.length) {
            let diffCount = 0;
            for (let i = 0; i < usernameLower.length; i++) {
                if (usernameLower[i] !== basedOnLower[i]) diffCount++;
            }
            if (diffCount === 1) return 'GANHUR';
        }

        if (usernameLower.length === basedOnLower.length) {
            for (let i = 0; i < basedOnLower.length - 1; i++) {
                const switched = basedOnLower.slice(0, i) + basedOnLower[i + 1] + basedOnLower[i] + basedOnLower.slice(i + 2);
                if (switched === usernameLower) return 'SWITCH';
            }
        }

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
    
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(u =>
          u.username.toLowerCase().includes(searchLower) ||
          (u.based_on && u.based_on.toLowerCase().includes(searchLower))
        );
      }
    
      if (filters.type !== 'all') {
        filtered = filtered.filter(u => u.username_type === filters.type); // Langsung pakai dari API
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
    
          // Username
          clone.querySelector('.username').textContent = username.username;
    
          // Username Type (SHAPE) - langsung dari database
          clone.querySelector('.username-type-badge').textContent = username.username_type || 'UNCOMMON';
    
          // Based On
          clone.querySelector('.based-on-value').textContent = username.based_on || '';
    
          // Price
          clone.querySelector('.price-value').textContent = formatRupiah(username.price);
    
          const div = document.createElement('div');
          div.appendChild(clone);
          gridHtml += div.innerHTML;
        });
        gridHtml += '</div>';
      }
    
      marketPage.innerHTML = headerHtml + gridHtml;
    
      // Re-assign elements
      elements.marketSearch = document.getElementById('marketSearchInput');
      elements.filterToggle = document.getElementById('filterToggleBtn');
      elements.filterBadge = document.getElementById('filterBadge');
      elements.searchClearBtn = document.getElementById('searchClearBtn');
      elements.searchSubmitBtn = document.getElementById('searchSubmitBtn');
    
      // Search box logic - show/hide buttons based on input
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
            hapticFeedback('medium');
            filters.search = elements.marketSearch.value;
            applyFilters();
            elements.marketSearch.blur();
          }
        });
      }
    
      // Clear button
      if (elements.searchClearBtn) {
        elements.searchClearBtn.addEventListener('click', (e) => {
          e.hapticProcessed = true;
          hapticFeedback('light');
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
        elements.searchSubmitBtn.addEventListener('click', (e) => {
          e.hapticProcessed = true;
          hapticFeedback('medium');
          if (elements.marketSearch) {
            filters.search = elements.marketSearch.value;
            applyFilters();
            elements.marketSearch.blur();
          }
        });
      }
    
      // Filter toggle button
      if (elements.filterToggle) {
        elements.filterToggle.addEventListener('click', (e) => {
          e.hapticProcessed = true;
          toggleFilterPanel();
        });
      }
    
          setTimeout(() => {
            if (typeof setupPanel === 'function' && !window.panelSetupDone) {
              setupPanel();
              window.panelSetupDone = true;
            }
          
            document.querySelectorAll('.username-card').forEach(card => {
              // Hapus event listener lama dengan clone node
              const newCard = card.cloneNode(true);
              card.parentNode.replaceChild(newCard, card);
          
              newCard.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
          
                if (e.hapticProcessed) return;
                e.hapticProcessed = true;
          
                // Haptic feedback
                if (typeof hapticFeedback === 'function') {
                  hapticFeedback('light');
                }
          
                // Ambil username dari elemen dengan class 'username'
                const usernameElement = newCard.querySelector('.username');
                if (usernameElement) {
                  const username = usernameElement.textContent.trim();
                  console.log('🔍 Card clicked - username:', username);
          
                  // TAMPILKAN PANEL - pastikan fungsi showUsernamePanel ada
                  if (typeof showUsernamePanel === 'function') {
                    showUsernamePanel(username);
                  } else {
                    console.error('showUsernamePanel function not found!');
                  }
                } else {
                  console.error('Username element not found in card');
                }
              });
            });
          
            // Handle empty market click
            const emptyMarket = document.querySelector('.empty-market');
            if (emptyMarket) {
              const newEmptyMarket = emptyMarket.cloneNode(true);
              emptyMarket.parentNode.replaceChild(newEmptyMarket, emptyMarket);
          
              newEmptyMarket.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
          
                if (e.hapticProcessed) return;
                e.hapticProcessed = true;
          
                if (typeof hapticFeedback === 'function') {
                  hapticFeedback('light');
                }
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
                
                // Extract username from details if available
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
            hapticFeedback('medium');
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
                    hapticFeedback('warning');
                    resetFilters();
                    toggleFilterPanel();
                });
            }
    
            if (elements.applyFilters) {
                elements.applyFilters.addEventListener('click', () => {
                    hapticFeedback('success');
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
                    hapticFeedback('light');
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
                        // Always load activities when switching to activity page
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
                    hapticFeedback('selection');
                    elements.marketMain.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                });
            }
        }
    
        // ==================== HAPTIC FEEDBACK ====================
        function hapticFeedback(style = 'light') {
          if (!window.Telegram?.WebApp?.HapticFeedback) return;
        
          try {
            switch (style) {
              case 'light':
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                break;
              case 'medium':
                window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                break;
              case 'heavy':
                window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
                break;
              case 'success':
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                break;
              case 'error':
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
                break;
              case 'warning':
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
                break;
              case 'selection':
                window.Telegram.WebApp.HapticFeedback.selectionChanged();
                break;
              default:
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
          } catch (e) {
            console.log('Haptic feedback not supported');
          }
        }
        
        // ==================== AUTO HAPTIC FOR ALL BUTTONS ====================
        function setupHapticForButtons() {
          const clickableElements = document.querySelectorAll('button, .nav-item, .chip, .filter-section-header, .filter-close, .search-clear-btn, .search-submit-btn, .filter-toggle-btn, .filter-btn, .scroll-top-btn, .user-profile-card');
        
          clickableElements.forEach(element => {
            element.addEventListener('click', (e) => {
              if (e.defaultPrevented) return;
        
              if (element.classList.contains('nav-item')) {
                hapticFeedback('light');
              } else if (element.classList.contains('chip')) {
                hapticFeedback('selection');
              } else if (element.classList.contains('filter-btn') || element.classList.contains('apply')) {
                hapticFeedback('medium');
              } else if (element.classList.contains('reset')) {
                hapticFeedback('warning');
              } else if (element.classList.contains('filter-close')) {
                hapticFeedback('light');
              } else if (element.classList.contains('scroll-top-btn')) {
                hapticFeedback('heavy');
              } else {
                hapticFeedback('light');
              }
            });
          });
        }
        
        async function loadUsernameDetail(username) {
            try {
                // Cari data dari allUsernames yang sudah ada
                const userData = allUsernames.find(u => u.username === username);
                
                if (!userData) {
                    showToast('Data username tidak ditemukan', 'error');
                    hideUsernamePanel();
                    return;
                }
                
                renderUsernamePanel(userData);
                
            } catch (error) {
                console.error('Error loading username detail:', error);
                showToast('Gagal memuat detail username', 'error');
                hideUsernamePanel();
            }
        }
        
        function renderUsernamePanel(data) {
            if (!elements.panelUsername || !elements.panelInfoGrid) return;
            
            // Set username
            elements.panelUsername.textContent = `@${data.username}`;
            
            // Format kind dengan emoji
            const kindEmoji = {
                "MULCHAR INDO": "🇮🇩",
                "MULCHAR ENG": "🇬🇧",
                "IDOL MALE": "👨",
                "IDOL FEMALE": "👩",
                "NSFW": "🔞",
                "2D": "🎮",
                "ANIME": "🌸",
                "ANOTHER": "❓"
            }[data.kind] || "❓";
            
            // Format type
            const typeText = data.type === 'channel' ? '📢 Channel' : '👤 User';
            
            // Format tanggal
            const date = data.updated_at ? new Date(data.updated_at) : new Date();
            const formattedDate = date.toLocaleDateString('id-ID', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            
            // Buat info grid
            const infoGrid = `
                <div class="info-row">
                    <span class="info-label"><i class="fas fa-at"></i> Based on</span>
                    <span class="info-value">${data.based_on || '-'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label"><i class="fas fa-shapes"></i> Bentuk</span>
                    <span class="info-value"><span class="badge">${data.username_type || 'OP'}</span></span>
                </div>
                <div class="info-row">
                    <span class="info-label"><i class="fas fa-tag"></i> Jenis</span>
                    <span class="info-value">${kindEmoji} ${data.kind || 'MULCHAR INDO'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label"><i class="fas fa-user"></i> Type</span>
                    <span class="info-value">${typeText}</span>
                </div>
                <div class="info-row">
                    <span class="info-label"><i class="fas fa-credit-card"></i> Harga</span>
                    <span class="info-value price">${formatRupiah(data.price)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label"><i class="fas fa-calendar-alt"></i> Added</span>
                    <span class="info-value date">${formattedDate}</span>
                </div>
            `;
            
            elements.panelInfoGrid.innerHTML = infoGrid;
            
            // Sembunyikan loading, tampilkan detail
            elements.panelLoading.style.display = 'none';
            elements.panelDetail.style.display = 'block';
        }
    
    // ==================== SETUP PANEL ====================
    function setupPanel() {
        if (!elements.usernamePanel) return;
        
        // Buat overlay jika belum ada
        let overlay = document.getElementById('panelOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'panelOverlay';
            overlay.className = 'panel-overlay';
            document.body.appendChild(overlay);
        }
        
        // Variabel untuk drag
        let startY = 0;
        let currentY = 0;
        let isDragging = false;
        let panelHeight = 0;
        
        // Tombol close
        if (elements.panelCloseBtn) {
            elements.panelCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                hapticFeedback('light');
                hideUsernamePanel();
            });
        }
        
        // Tombol cart
        if (elements.panelCartBtn) {
            elements.panelCartBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                hapticFeedback('medium');
                showToast('Fitur keranjang akan segera hadir!', 'info');
            });
        }
        
        // Tombol buy
        if (elements.panelBuyBtn) {
            elements.panelBuyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                hapticFeedback('heavy');
                showToast('Fitur pembelian akan segera hadir!', 'info');
            });
        }
        
        // Tombol offer
        if (elements.panelOfferBtn) {
            elements.panelOfferBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                hapticFeedback('medium');
                showToast('Fitur penawaran akan segera hadir!', 'info');
            });
        }
        
        // Klik overlay untuk menutup panel
        overlay.addEventListener('click', () => {
            hideUsernamePanel();
        });
        
        // Fungsi untuk menangani drag start
        const handleTouchStart = (e) => {
            // Jangan start drag jika menyentuh button
            if (e.target.closest('button')) return;
            
            startY = e.touches[0].clientY;
            isDragging = true;
            panelHeight = elements.usernamePanel.offsetHeight;
            
            // Nonaktifkan transisi selama drag
            elements.usernamePanel.style.transition = 'none';
            e.preventDefault();
        };
        
        // Fungsi untuk menangani drag move
        const handleTouchMove = (e) => {
            if (!isDragging) return;
            
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            
            // Hanya drag ke bawah (positif)
            if (deltaY > 0) {
                // Batasi drag maksimal setengah panel
                const maxDrag = panelHeight * 0.8;
                const translateY = Math.min(deltaY, maxDrag);
                elements.usernamePanel.style.transform = `translateY(${translateY}px)`;
                
                // Update opacity overlay berdasarkan jarak drag
                const opacity = Math.max(0, 1 - (deltaY / maxDrag));
                overlay.style.opacity = opacity;
            }
            
            e.preventDefault();
        };
        
        // Fungsi untuk menangani drag end
        const handleTouchEnd = () => {
            if (!isDragging) return;
            
            isDragging = false;
            
            // Hitung seberapa jauh drag
            const deltaY = currentY - startY;
            const panelHeight = elements.usernamePanel.offsetHeight;
            
            // Kembalikan transisi
            elements.usernamePanel.style.transition = '';
            
            // Jika drag lebih dari 25% tinggi panel, tutup panel
            if (deltaY > panelHeight * 0.25) {
                hideUsernamePanel();
            } else {
                // Kembali ke posisi semula
                elements.usernamePanel.style.transform = '';
                overlay.style.opacity = '1';
            }
            
            // Reset nilai
            startY = 0;
            currentY = 0;
        };
        
        // Handle untuk drag di handle
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
        
        // Handle untuk drag di seluruh panel
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
        
        hapticFeedback('medium');
        
        // Tampilkan loading
        elements.panelLoading.style.display = 'flex';
        elements.panelDetail.style.display = 'none';
        
        // Reset transform panel
        elements.usernamePanel.style.transform = '';
        
        // Buka panel
        elements.usernamePanel.classList.add('show');
        
        // Tampilkan overlay
        const overlay = document.getElementById('panelOverlay');
        if (overlay) {
            overlay.classList.add('show');
            overlay.style.opacity = '1';
        }
        
        document.body.classList.add('panel-open'); // Mencegah scroll background
        
        // Load data username dari API
        loadUsernameDetailFromAPI(username);
    }
    
    function hideUsernamePanel() {
        if (!elements.usernamePanel) return;
        
        elements.usernamePanel.classList.remove('show');
        
        // Sembunyikan overlay
        const overlay = document.getElementById('panelOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
        
        document.body.classList.remove('panel-open');
        
        // Reset transform jika ada
        elements.usernamePanel.style.transform = '';
    }
    
    function renderUsernamePanel(data) {
        console.log('🔍 renderUsernamePanel called with:', data);
        
        if (!elements.panelUsername || !elements.panelInfoGrid) {
            console.error('Panel elements not found!');
            return;
        }
        
        // Set username
        elements.panelUsername.textContent = `@${data.username}`;
        
        // Format kind dengan emoji
        const kindEmoji = {
            "MULCHAR INDO": "🇮🇩",
            "MULCHAR ENG": "🇬🇧",
            "IDOL MALE": "👨",
            "IDOL FEMALE": "👩",
            "NSFW": "🔞",
            "2D": "🎮",
            "ANIME": "🌸",
            "ANOTHER": "❓"
        }[data.kind] || "❓";
        
        // Format type
        const typeText = data.type === 'channel' ? '📢 Channel' : '👤 User';
        
        // Format tanggal
        const date = data.updated_at ? new Date(data.updated_at) : new Date();
        const formattedDate = date.toLocaleDateString('id-ID', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        
        // Buat info grid - DALAM SATU KOLOM (container sudah dari HTML)
        const infoGrid = `
            <div class="info-row">
                <span class="info-label"><i class="fas fa-at"></i> Based on</span>
                <span class="info-value">${data.based_on || '-'}</span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-shapes"></i> Bentuk</span>
                <span class="info-value"><span class="badge">${data.username_type || 'OP'}</span></span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-tag"></i> Jenis</span>
                <span class="info-value">${kindEmoji} ${data.kind || 'MULCHAR INDO'}</span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-user"></i> Type</span>
                <span class="info-value">${typeText}</span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-credit-card"></i> Harga</span>
                <span class="info-value price">${formatRupiah(data.price)}</span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-calendar-alt"></i> Added</span>
                <span class="info-value date">${formattedDate}</span>
            </div>
        `;
        
        elements.panelInfoGrid.innerHTML = infoGrid;
        
        // Sembunyikan loading, tampilkan detail
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
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            renderUsernamePanel(response);
            
        } catch (error) {
            console.error('Error loading username detail:', error);
            showToast('Gagal memuat detail username', 'error');
            hideUsernamePanel();
        }
    }
    
    async function init() {
      showLoading(true);
    
      try {
        // ===== INISIALISASI HAPTIC PALING AWAL =====
        console.log('📳 Initializing haptic feedback...');
    
        // Cek ketersediaan Telegram WebApp
        if (window.Telegram?.WebApp) {
          console.log('📱 Telegram WebApp detected, version:', window.Telegram.WebApp.version);
    
          // Inisialisasi haptic
          initHaptic();
    
          // Test haptic setelah 500ms (untuk memastikan bekerja)
          setTimeout(() => {
            hapticImpact('light');
            console.log('📳 Haptic test successful');
          }, 500);
        } else {
          console.log('⚠️ Telegram WebApp not detected - running in browser mode');
    
          // Fallback untuk browser (simulasi)
          window.Telegram = {
            WebApp: {
              HapticFeedback: {
                impactOccurred: (style) => console.log(`📳 [BROWSER] Haptic impact: ${style}`),
                notificationOccurred: (type) => console.log(`📳 [BROWSER] Haptic notification: ${type}`),
                selectionChanged: () => console.log(`📳 [BROWSER] Haptic selection changed`)
              }
            }
          };
    
          // Inisialisasi ulang dengan simulasi
          initHaptic();
        }
    
        // ===== INISIALISASI TELEGRAM USER =====
        await initTelegramUser();
        renderUserProfile();
    
        // ===== SETUP NAVIGATION =====
        setupNavigation();
    
        // ===== SETUP FILTER PANEL =====
        setupFilterPanel();
    
        // ===== SETUP SCROLL HANDLING =====
        setupScrollHandling();
    
        // ===== SETUP HAPTIC UNTUK SEMUA TOMBOL =====
        // Beri sedikit delay agar DOM siap
        setTimeout(() => {
          setupHapticForButtons();
          console.log('✅ Haptic buttons initialized');
        }, 200);
    
        // ===== LOAD DATA =====
        await loadMarketData();
        await loadUserUsernames();
        
        // ===== SETUP PANEL CARD =====
        setupPanel();
        
        // ===== RENDER GAMES =====
        renderGames();
    
        // ===== TELEGRAM WEBAPP READY =====
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.expand();
          window.Telegram.WebApp.ready();
          console.log('📱 Telegram WebApp ready');
        }
    
        console.log('✅ INDOTAG MARKET initialized successfully');
    
      } catch (error) {
        console.error('❌ Init error:', error);
        showToast('Gagal memuat aplikasi', 'error');
    
        // Coba haptic error
        try {
          hapticNotification('error');
        } catch (e) {
          // Abaikan
        }
    
      } finally {
        showLoading(false);
      }
    }

    init();
})();