// script.js - Main frontend logic

// Initialize Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
if (tg.disableVerticalSwipes) {
    tg.disableVerticalSwipes();
}

// State management
let appState = {
    currentPage: 'market',
    user: null,
    loadingStates: {
        market: true,
        games: true,
        activity: true,
        profile: true
    },
    data: {
        market: [],
        games: [],
        activity: [],
        profile: {}
    },
    filters: {
        search: '',
        based_on: '',
        type: '',
        min_price: 0,
        max_price: 999999999,
        sort_by: 'latest'
    },
    pagination: {
        market: { page: 1, total: 0, perPage: 20 },
        games: { page: 1, total: 0, perPage: 20 },
        activity: { page: 1, total: 0, perPage: 15 },
        profile: { page: 1, total: 0, perPage: 10 }
    }
};

// DOM Elements
const mainContainer = document.getElementById('mainContainer');
const pagesContainer = document.getElementById('pagesContainer');
const filterBar = document.getElementById('filterBar');
const filterPanel = document.getElementById('filterPanel');
const topBorder = document.getElementById('topBorder');
const borderPagination = document.getElementById('borderPagination');
const floatingNav = document.getElementById('floatingNav');
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const appTitle = document.getElementById('appTitle');
const userInfo = document.getElementById('userInfo');
const pullIndicator = document.getElementById('pullIndicator');

// Scroll variables
let touchStart = 0;
let touchMove = 0;
let isPulling = false;
let pullThreshold = 60;
let lastScrollTop = 0;
let elementsVisible = {
    topBorder: true,
    filterBar: true,
    borderPagination: true,
    floatingNav: true
};
let scrollTimeout;
let hideTimeout;

// Initialize app
async function initApp() {
    appTitle.textContent = window.CONFIG?.APP_NAME || 'INDOTAG';
    
    await detectTelegramUser();
    
    setupNavigation();
    setupPullToRefresh();
    setupScrollBlocker();
    setupScrollHide();
    setupFilterButtons();
    setupPagination();
    
    loadPageData('market');
    loadBasedOnOptions();
    
    tg.ready();
}

// Detect Telegram user
async function detectTelegramUser() {
    try {
        if (tg.initDataUnsafe?.user) {
            const user = tg.initDataUnsafe.user;
            appState.user = user;
            renderUserInfo(user);
            console.log('✅ User detected:', user);
        } else {
            renderUserInfo(null);
        }
    } catch (error) {
        console.error('❌ Error detecting user:', error);
        renderUserInfo(null);
    }
}

// Render user info dengan avatar
function renderUserInfo(user) {
    if (!user) {
        userInfo.innerHTML = `
            <div class="user-details">
                <div class="user-text">
                    <div class="user-name">Guest</div>
                    <div class="user-username"><span>👤</span> @guest</div>
                </div>
                <div class="user-avatar">
                    <span>👤</span>
                </div>
            </div>
        `;
        return;
    }
    
    const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || '');
    const displayName = user.first_name || 'User';
    const username = user.username ? `@${user.username}` : '';
    
    // Cek apakah ada photo_url dari Telegram
    if (user.photo_url) {
        userInfo.innerHTML = `
            <div class="user-details">
                <div class="user-text">
                    <div class="user-name">${displayName}</div>
                    <div class="user-username"><span>🔗</span> ${username || 'no username'}</div>
                </div>
                <div class="user-avatar">
                    <img src="${user.photo_url}" alt="${displayName}" onerror="this.style.display='none';this.parentElement.innerHTML='<span>👤</span>'">
                </div>
            </div>
        `;
    } else {
        // Gunakan UI Avatars jika tidak ada foto
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials || 'U')}&size=48&background=40a7e3&color=fff&bold=true`;
        userInfo.innerHTML = `
            <div class="user-details">
                <div class="user-text">
                    <div class="user-name">${displayName}</div>
                    <div class="user-username"><span>🔗</span> ${username || 'no username'}</div>
                </div>
                <div class="user-avatar">
                    <img src="${avatarUrl}" alt="${displayName}">
                </div>
            </div>
        `;
    }
}

// Setup navigation
function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            switchPage(page);
        });
    });
}

// Switch page
function switchPage(page) {
    navItems.forEach(item => {
        if (item.dataset.page === page) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    pages.forEach(p => {
        if (p.id === `${page}Page`) {
            p.classList.add('active');
        } else {
            p.classList.remove('active');
        }
    });
    
    appState.currentPage = page;
    updatePaginationInfo(page);
    
    if (appState.loadingStates[page]) {
        loadPageData(page);
    }
}

// Setup pagination
function setupPagination() {
    document.getElementById('prevPageBtn').addEventListener('click', () => {
        const page = appState.currentPage;
        if (appState.pagination[page].page > 1) {
            appState.pagination[page].page--;
            loadPageData(page);
        }
    });
    
    document.getElementById('nextPageBtn').addEventListener('click', () => {
        const page = appState.currentPage;
        const totalPages = Math.ceil(appState.pagination[page].total / appState.pagination[page].perPage);
        if (appState.pagination[page].page < totalPages) {
            appState.pagination[page].page++;
            loadPageData(page);
        }
    });
}

// Update pagination info
function updatePaginationInfo(page) {
    const pagination = appState.pagination[page];
    const totalPages = Math.ceil(pagination.total / pagination.perPage) || 1;
    document.getElementById('paginationInfo').textContent = `Halaman ${pagination.page} dari ${totalPages}`;
    
    document.getElementById('prevPageBtn').disabled = pagination.page <= 1;
    document.getElementById('nextPageBtn').disabled = pagination.page >= totalPages;
}

// Load page data
async function loadPageData(page) {
    const container = document.getElementById(`${page}Items`) || document.getElementById(`${page}Details`);
    if (!container) return;
    
    showLoadingState(container, page);
    
    try {
        let url = `${window.CONFIG?.API_BASE_URL}/api/`;
        let data = [];
        let total = 0;
        
        const pagination = appState.pagination[page];
        const params = new URLSearchParams({
            page: pagination.page,
            limit: pagination.perPage
        });
        
        if (page === 'market') {
            if (appState.filters.search) params.append('search', appState.filters.search);
            if (appState.filters.based_on) params.append('based_on', appState.filters.based_on);
            if (appState.filters.type) params.append('type', appState.filters.type);
            if (appState.filters.min_price > 0) params.append('min_price', appState.filters.min_price);
            if (appState.filters.max_price < 999999999) params.append('max_price', appState.filters.max_price);
            if (appState.filters.sort_by) params.append('sort_by', appState.filters.sort_by);
            
            url += `market?${params.toString()}`;
            
            console.log('🔍 Fetching market data from:', url);
            const response = await fetch(url);
            
            if (response.ok) {
                data = await response.json();
                total = parseInt(response.headers.get('X-Total-Count') || data.length);
                document.getElementById('marketCount').textContent = data.length;
            }
        } else if (page === 'games' && appState.user) {
            url += `user-usernames/${appState.user.id}?${params.toString()}`;
            console.log('🔍 Fetching user usernames from:', url);
            const response = await fetch(url);
            
            if (response.ok) {
                data = await response.json();
                total = data.length;
                document.getElementById('usernamesCount').textContent = data.length;
            }
        } else if (page === 'activity' && appState.user) {
            url += `activity/${appState.user.id}?${params.toString()}`;
            console.log('🔍 Fetching activity from:', url);
            const response = await fetch(url);
            
            if (response.ok) {
                data = await response.json();
                total = parseInt(response.headers.get('X-Total-Count') || data.length);
            }
        } else if (page === 'profile' && appState.user) {
            renderProfileData(container, appState.user);
            return;
        }
        
        appState.data[page] = data;
        appState.pagination[page].total = total;
        appState.loadingStates[page] = false;
        
        updatePaginationInfo(page);
        renderPageData(page, data);
        
    } catch (error) {
        console.error(`❌ Error loading ${page} data:`, error);
        showEmptyState(container, page);
    }
}

// Load based on options
async function loadBasedOnOptions() {
    try {
        const response = await fetch(`${window.CONFIG?.API_BASE_URL}/api/based-on-list`);
        if (response.ok) {
            const basedOnList = await response.json();
            console.log('📋 Based on options received:', basedOnList);
            const select = document.getElementById('basedOnFilter');
            
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            basedOnList.forEach(basedOn => {
                const option = document.createElement('option');
                option.value = basedOn;
                option.textContent = basedOn;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('❌ Error loading based on options:', error);
    }
}

// Show loading state
function showLoadingState(container, page) {
    const loadingHTML = Array(6).fill(0).map(() => `
        <div class="loading-item"></div>
    `).join('');
    
    container.innerHTML = loadingHTML;
}

// Show empty state
function showEmptyState(container, page) {
    const messages = {
        market: {
            icon: '🏪',
            title: 'Market Kosong',
            message: 'Belum ada username yang tersedia di market'
        },
        games: {
            icon: '📦',
            title: 'Belum Ada Username',
            message: 'Anda belum memiliki username yang tersimpan'
        },
        activity: {
            icon: '📊',
            title: 'Belum Ada Aktivitas',
            message: 'Belum ada catatan aktivitas'
        },
        profile: {
            icon: '👤',
            title: 'Informasi Profil',
            message: 'Silakan buka melalui Telegram untuk melihat profil'
        }
    };
    
    const msg = messages[page] || messages.market;
    
    container.innerHTML = `
        <div class="empty-state">
            <span>${msg.icon}</span>
            <h3>${msg.title}</h3>
            <p>${msg.message}</p>
        </div>
    `;
}

// Render page data
function renderPageData(page, data) {
    const container = document.getElementById(`${page}Items`) || document.getElementById(`${page}Details`);
    if (!container) return;
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
        showEmptyState(container, page);
        return;
    }
    
    switch(page) {
        case 'market':
            renderMarketData(container, data);
            break;
        case 'games':
            renderGamesData(container, data);
            break;
        case 'activity':
            renderActivityData(container, data);
            break;
        case 'profile':
            renderProfileData(container, data);
            break;
    }
}

// Render market data
function renderMarketData(container, items) {
    const html = `
        <div class="market-items">
            ${items.map(item => `
                <div class="market-item" onclick="showUsernameDetail('${item.username}')">
                    <div class="market-item-username">
                        <span>@</span> ${item.username}
                    </div>
                    <div class="market-item-basedon">
                        <span>🏷️</span> ${item.based_on || '-'}
                    </div>
                    <div class="market-item-type">
                        <span>📊</span> ${item.username_type || 'UNCOMMON'}
                    </div>
                    <div class="market-item-price">
                        <span>💰</span> Rp ${(item.price || 0).toLocaleString('id-ID')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    container.innerHTML = html;
}

// Render games data (My Usernames)
function renderGamesData(container, items) {
    const html = `
        <div class="games-items">
            ${items.map(item => `
                <div class="game-item" onclick="showUsernameDetail('${item.username}')">
                    <div class="game-item-username">
                        <span>@</span> ${item.username}
                    </div>
                    <div class="game-item-status ${item.listed_status}">
                        <span>${item.listed_status === 'listed' ? '✅' : '⏸️'}</span>
                        ${item.listed_status === 'listed' ? 'LISTED' : 'UNLISTED'}
                    </div>
                    <div class="game-item-price">
                        <span>💰</span> Rp ${(item.price || 0).toLocaleString('id-ID')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    container.innerHTML = html;
}

// Render activity data
function renderActivityData(container, items) {
    const html = `
        <div class="activity-items">
            ${items.map(item => `
                <div class="activity-item">
                    <div class="activity-time">
                        <span>🕒</span> ${formatDate(item.created_at) || 'Baru saja'}
                    </div>
                    <div class="activity-action">
                        <span>${getActivityIcon(item.action)}</span> ${item.action || 'Aktivitas'}
                    </div>
                    <div class="activity-details">${item.details || ''}</div>
                </div>
            `).join('')}
        </div>
    `;
    container.innerHTML = html;
}

// Get activity icon
function getActivityIcon(action) {
    const icons = {
        'USER_START': '🚀',
        'USERNAME_ADDED': '➕',
        'BASED_ON_SET': '🏷️',
        'PRICE_SET': '💰',
        'LISTED_STATUS': '🔄',
        'VERIFY': '✅'
    };
    return icons[action] || '📋';
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return null;
    try {
        const date = new Date(dateStr);
        return date.toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
}

// Render profile data
function renderProfileData(container, user) {
    fetch(`${window.CONFIG?.API_BASE_URL}/api/user-usernames/${user.id}`)
        .then(res => res.json())
        .then(data => {
            const totalUsernames = data.length;
            const listedUsernames = data.filter(u => u.listed_status === 'listed').length;
            
            container.innerHTML = `
                <div class="profile-details">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon"><span>📦</span></div>
                            <div class="stat-value">${totalUsernames}</div>
                            <div class="stat-label">Total Username</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><span>✅</span></div>
                            <div class="stat-value">${listedUsernames}</div>
                            <div class="stat-label">Listed</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><span>⏸️</span></div>
                            <div class="stat-value">${totalUsernames - listedUsernames}</div>
                            <div class="stat-label">Unlisted</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><span>📅</span></div>
                            <div class="stat-value">${new Date().getFullYear()}</div>
                            <div class="stat-label">Bergabung</div>
                        </div>
                    </div>
                    
                    <div class="profile-section">
                        <h3><span>👤</span> Informasi Akun</h3>
                        <div class="profile-info-row">
                            <span class="profile-info-label"><span>👤</span> Nama</span>
                            <span class="profile-info-value">${user.first_name || ''} ${user.last_name || ''}</span>
                        </div>
                        <div class="profile-info-row">
                            <span class="profile-info-label"><span>🔗</span> Username</span>
                            <span class="profile-info-value">${user.username ? '@' + user.username : '-'}</span>
                        </div>
                        <div class="profile-info-row">
                            <span class="profile-info-label"><span>🆔</span> User ID</span>
                            <span class="profile-info-value">${user.id}</span>
                        </div>
                    </div>
                    
                    <div class="profile-section">
                        <h3><span>📦</span> Daftar Username</h3>
                        <div class="username-list">
                            ${data.map(u => `
                                <div class="username-item" onclick="showUsernameDetail('${u.username}')">
                                    <div class="username-item-info">
                                        <span class="username-item-name">
                                            <span>@</span> ${u.username}
                                        </span>
                                        <span class="username-item-status ${u.listed_status}">
                                            <span>${u.listed_status === 'listed' ? '✅' : '⏸️'}</span>
                                            ${u.listed_status === 'listed' ? 'Listed' : 'Unlisted'}
                                        </span>
                                    </div>
                                    <span class="username-item-price">
                                        <span>💰</span> Rp ${(u.price || 0).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        })
        .catch(err => {
            console.error('❌ Error loading user usernames:', err);
            container.innerHTML = `
                <div class="profile-details">
                    <div class="profile-section">
                        <h3><span>👤</span> Informasi Akun</h3>
                        <div class="profile-info-row">
                            <span class="profile-info-label">👤 Nama</span>
                            <span class="profile-info-value">${user.first_name || ''} ${user.last_name || ''}</span>
                        </div>
                        <div class="profile-info-row">
                            <span class="profile-info-label">🔗 Username</span>
                            <span class="profile-info-value">${user.username ? '@' + user.username : '-'}</span>
                        </div>
                        <div class="profile-info-row">
                            <span class="profile-info-label">🆔 User ID</span>
                            <span class="profile-info-value">${user.id}</span>
                        </div>
                    </div>
                </div>
            `;
        });
}

// Show username detail
function showUsernameDetail(username) {
    tg.showPopup({
        title: '🔍 Detail Username',
        message: `@${username}\n\n✨ Fitur detail akan segera hadir!`,
        buttons: [{type: 'close', text: 'Tutup'}]
    });
}

// Toggle filter panel
function toggleFilterPanel() {
    filterPanel.classList.toggle('expanded');
    const arrow = document.querySelector('.filter-arrow');
    if (filterPanel.classList.contains('expanded')) {
        arrow.style.transform = 'rotate(180deg)';
    } else {
        arrow.style.transform = 'rotate(0deg)';
    }
}

// Setup filter buttons
function setupFilterButtons() {
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.filters.type = btn.dataset.type;
            applyFilters();
        });
    });
    
    document.querySelectorAll('.subtype-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.subtype-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.filters.type = btn.dataset.subtype;
            
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            
            applyFilters();
        });
    });
}

// Apply filters
function applyFilters() {
    appState.filters.search = document.getElementById('searchInput').value;
    appState.filters.based_on = document.getElementById('basedOnFilter').value;
    appState.filters.min_price = parseInt(document.getElementById('minPrice').value) || 0;
    appState.filters.max_price = parseInt(document.getElementById('maxPrice').value) || 999999999;
    appState.filters.sort_by = document.getElementById('sortBy').value;
    
    appState.pagination.market.page = 1;
    appState.loadingStates.market = true;
    loadPageData('market');
}

// Debounce search
let searchTimeout;
function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        applyFilters();
    }, 500);
}

// Setup pull to refresh
function setupPullToRefresh() {
    mainContainer.addEventListener('touchstart', (e) => {
        if (mainContainer.scrollTop === 0) {
            touchStart = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });
    
    mainContainer.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        
        touchMove = e.touches[0].clientY;
        const pullDistance = touchMove - touchStart;
        
        if (pullDistance > 0 && mainContainer.scrollTop === 0) {
            e.preventDefault();
            
            if (pullDistance < pullThreshold) {
                mainContainer.classList.add('pulling');
                mainContainer.classList.remove('pulling-max');
            } else {
                mainContainer.classList.add('pulling-max');
            }
            
            pullIndicator.style.transform = `translateY(${Math.min(pullDistance * 0.3, 30)}px)`;
        }
    }, { passive: false });
    
    mainContainer.addEventListener('touchend', () => {
        if (isPulling) {
            const pullDistance = touchMove - touchStart;
            
            if (pullDistance >= pullThreshold) {
                refreshCurrentPage();
            }
            
            mainContainer.classList.remove('pulling', 'pulling-max');
            pullIndicator.style.transform = '';
            isPulling = false;
        }
    });
    
    mainContainer.addEventListener('touchcancel', () => {
        mainContainer.classList.remove('pulling', 'pulling-max');
        pullIndicator.style.transform = '';
        isPulling = false;
    });
}

// Refresh current page
function refreshCurrentPage() {
    const page = appState.currentPage;
    appState.pagination[page].page = 1;
    appState.loadingStates[page] = true;
    loadPageData(page);
    
    tg.showPopup({
        title: '🔄 Refresh',
        message: 'Halaman telah diperbarui!',
        buttons: [{type: 'close', text: 'OK'}]
    });
}

// Setup scroll blocker
function setupScrollBlocker() {
    mainContainer.addEventListener('scroll', () => {
        if (mainContainer.scrollTop < 0) {
            mainContainer.scrollTop = 0;
        }
    });
    
    mainContainer.addEventListener('touchmove', (e) => {
        if (mainContainer.scrollTop <= 0 && e.touches[0].clientY > touchStart) {
            e.preventDefault();
        }
    }, { passive: false });
}

// Setup scroll hide untuk elemen fixed
function setupScrollHide() {
    mainContainer.addEventListener('scroll', () => {
        const scrollTop = mainContainer.scrollTop;
        
        // Clear previous timeout
        clearTimeout(scrollTimeout);
        clearTimeout(hideTimeout);
        
        // Hide elements when scrolling down
        if (scrollTop > lastScrollTop && scrollTop > 50) {
            if (elementsVisible.topBorder) {
                topBorder.classList.add('hidden');
                elementsVisible.topBorder = false;
            }
            
            if (elementsVisible.filterBar) {
                filterBar.classList.add('hidden');
                mainContainer.classList.add('filter-hidden');
                elementsVisible.filterBar = false;
            }
            
            if (elementsVisible.borderPagination) {
                borderPagination.classList.add('hidden');
                elementsVisible.borderPagination = false;
            }
        } 
        // Show elements when scrolling up
        else if (scrollTop < lastScrollTop) {
            if (!elementsVisible.topBorder) {
                topBorder.classList.remove('hidden');
                elementsVisible.topBorder = true;
            }
            
            if (!elementsVisible.filterBar) {
                filterBar.classList.remove('hidden');
                mainContainer.classList.remove('filter-hidden');
                elementsVisible.filterBar = true;
            }
            
            if (!elementsVisible.borderPagination) {
                borderPagination.classList.remove('hidden');
                elementsVisible.borderPagination = true;
            }
        }
        
        // Hide floating nav after scroll stops
        if (scrollTop > 100) {
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                if (elementsVisible.floatingNav) {
                    floatingNav.classList.add('hidden');
                    elementsVisible.floatingNav = false;
                }
            }, 2000);
        } else {
            if (!elementsVisible.floatingNav) {
                floatingNav.classList.remove('hidden');
                elementsVisible.floatingNav = true;
            }
        }
        
        // Show floating nav when scroll stops
        scrollTimeout = setTimeout(() => {
            if (!elementsVisible.floatingNav && scrollTop > 100) {
                floatingNav.classList.remove('hidden');
                elementsVisible.floatingNav = true;
            }
        }, 150);
        
        lastScrollTop = scrollTop;
    });
}

// Global functions
window.toggleFilterPanel = toggleFilterPanel;
window.debounceSearch = debounceSearch;
window.applyFilters = applyFilters;
window.showUsernameDetail = showUsernameDetail;

// Initialize
document.addEventListener('DOMContentLoaded', initApp);