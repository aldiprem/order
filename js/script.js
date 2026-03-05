// script.js - Main frontend logic

// Initialize Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Expand to full height
if (tg.disableVerticalSwipes) {
    tg.disableVerticalSwipes(); // Disable vertical swipes to prevent refresh
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
    }
};

// DOM Elements
const mainContent = document.getElementById('mainContent');
const scrollContainer = document.getElementById('scrollContainer');
const filterBar = document.getElementById('filterBar');
const filterPanel = document.getElementById('filterPanel');
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const appTitle = document.getElementById('appTitle');
const userInfo = document.getElementById('userInfo');

// Pull visual variables (no refresh function)
let touchStart = 0;
let touchMove = 0;
let isPulling = false;
let pullThreshold = 60;
let lastScrollTop = 0;
let filterVisible = true;

// Initialize app
async function initApp() {
    // Set app title
    appTitle.textContent = window.CONFIG?.APP_NAME || 'INDOTAG MARKET';
    
    // Detect Telegram user
    await detectTelegramUser();
    
    // Set up event listeners
    setupNavigation();
    setupPullVisual();
    setupScrollBlocker();
    setupScrollHideFilter();
    setupFilterButtons();
    
    // Load initial page data
    loadPageData('market');
    loadBasedOnOptions();
    
    // Hide loading after initial setup
    tg.ready();
}

// Detect Telegram user
async function detectTelegramUser() {
    try {
        if (tg.initDataUnsafe?.user) {
            const user = tg.initDataUnsafe.user;
            appState.user = user;
            renderUserInfo(user);
            
            // Verify with backend - HAPUS INI karena endpoint tidak ada
            // await verifyUserWithBackend(user);
            console.log('User detected:', user);
        } else {
            renderUserInfo(null);
        }
    } catch (error) {
        console.error('Error detecting user:', error);
        renderUserInfo(null);
    }
}

// HAPUS fungsi ini karena tidak digunakan
// async function verifyUserWithBackend(user) { ... }

// Render user info
function renderUserInfo(user) {
    if (!user) {
        userInfo.innerHTML = `
            <div class="user-details">
                <div class="user-text">
                    <div class="user-name">Guest</div>
                    <div class="user-username">@guest</div>
                </div>
                <div class="user-avatar">G</div>
            </div>
        `;
        return;
    }
    
    const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || '');
    const displayName = user.first_name || 'User';
    const username = user.username ? `@${user.username}` : '';
    
    userInfo.innerHTML = `
        <div class="user-details">
            <div class="user-text">
                <div class="user-name">${displayName}</div>
                <div class="user-username">${username}</div>
            </div>
            <div class="user-avatar">${initials || 'U'}</div>
        </div>
    `;
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
    // Update active states
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
    
    // Load page data if not loaded
    if (appState.loadingStates[page]) {
        loadPageData(page);
    }
}

// Load page data
async function loadPageData(page) {
    const container = document.getElementById(`${page}Items`) || document.getElementById(`${page}Details`);
    if (!container) return;
    
    // Show loading state
    showLoadingState(container, page);
    
    try {
        let url = `${window.CONFIG?.API_BASE_URL}/api/`;
        
        if (page === 'market') {
            // Build filter query
            const params = new URLSearchParams();
            if (appState.filters.search) params.append('search', appState.filters.search);
            if (appState.filters.based_on) params.append('based_on', appState.filters.based_on);
            if (appState.filters.type) params.append('type', appState.filters.type);
            if (appState.filters.min_price > 0) params.append('min_price', appState.filters.min_price);
            if (appState.filters.max_price < 999999999) params.append('max_price', appState.filters.max_price);
            if (appState.filters.sort_by) params.append('sort_by', appState.filters.sort_by);
            
            url += `market?${params.toString()}`;
            
            console.log('Fetching market data from:', url);
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Market data received:', data);
                appState.data[page] = data;
                appState.loadingStates[page] = false;
                renderPageData(page, data);
            } else {
                console.error('Failed to fetch market data, status:', response.status);
                throw new Error('Failed to fetch data');
            }
        } else if (page === 'games' && appState.user) {
            url += `user-usernames/${appState.user.id}`;
            console.log('Fetching user usernames from:', url);
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                console.log('User usernames received:', data);
                appState.data[page] = data;
                appState.loadingStates[page] = false;
                renderPageData(page, data);
            } else {
                throw new Error('Failed to fetch data');
            }
        } else if (page === 'activity' && appState.user) {
            url += `activity/${appState.user.id}`;
            console.log('Fetching activity from:', url);
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Activity received:', data);
                appState.data[page] = data;
                appState.loadingStates[page] = false;
                renderPageData(page, data);
            } else {
                throw new Error('Failed to fetch data');
            }
        } else if (page === 'profile') {
            // Profile data is handled in renderProfileData
            appState.loadingStates[page] = false;
            renderPageData(page, {});
        }
    } catch (error) {
        console.error(`Error loading ${page} data:`, error);
        showEmptyState(container, page);
    }
}

// Load based on options for filter
async function loadBasedOnOptions() {
    try {
        const response = await fetch(`${window.CONFIG?.API_BASE_URL}/api/based-on-list`);
        if (response.ok) {
            const basedOnList = await response.json();
            console.log('Based on options received:', basedOnList);
            const select = document.getElementById('basedOnFilter');
            
            // Clear existing options
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
        console.error('Error loading based on options:', error);
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
        market: 'Tidak ada username di market',
        games: 'Anda belum memiliki username',
        activity: 'Belum ada aktivitas',
        profile: 'Tidak ada informasi profil'
    };
    
    container.innerHTML = `
        <div class="empty-state">
            ${messages[page] || 'Tidak ada data'}
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
    if (!items || items.length === 0) {
        showEmptyState(container, 'market');
        return;
    }
    
    const html = `
        <div class="market-grid">
            ${items.map(item => `
                <div class="market-item" onclick="showUsernameDetail('${item.username}')">
                    <div class="market-item-username">@${item.username}</div>
                    <div class="market-item-basedon">${item.based_on || '-'}</div>
                    <div class="market-item-type">${item.username_type || 'UNCOMMON'}</div>
                    <div class="market-item-price">Rp ${(item.price || 0).toLocaleString('id-ID')}</div>
                </div>
            `).join('')}
        </div>
    `;
    container.innerHTML = html;
}

// Render games data (My Usernames)
function renderGamesData(container, items) {
    if (!items || items.length === 0) {
        showEmptyState(container, 'games');
        return;
    }
    
    const html = `
        <div class="games-grid">
            ${items.map(item => `
                <div class="game-item" onclick="showUsernameDetail('${item.username}')">
                    <div class="game-item-username">@${item.username}</div>
                    <div class="game-item-status ${item.listed_status}">${item.listed_status === 'listed' ? 'LISTED' : 'UNLISTED'}</div>
                    <div class="game-item-price">Rp ${(item.price || 0).toLocaleString('id-ID')}</div>
                </div>
            `).join('')}
        </div>
    `;
    container.innerHTML = html;
}

// Render activity data
function renderActivityData(container, items) {
    if (!items || items.length === 0) {
        showEmptyState(container, 'activity');
        return;
    }
    
    const html = `
        <div class="activity-list">
            ${items.map(item => `
                <div class="activity-item">
                    <div class="activity-time">${formatDate(item.created_at) || 'Baru saja'}</div>
                    <div class="activity-action">${item.action || 'Aktivitas'}</div>
                    <div class="activity-details">${item.details || ''}</div>
                </div>
            `).join('')}
        </div>
    `;
    container.innerHTML = html;
}

// Format date helper
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
function renderProfileData(container, profile) {
    if (!appState.user) {
        container.innerHTML = `
            <div class="empty-state">
                Silakan buka melalui Telegram untuk melihat profil
            </div>
        `;
        return;
    }
    
    const user = appState.user;
    
    // Load user's usernames
    fetch(`${window.CONFIG?.API_BASE_URL}/api/user-usernames/${user.id}`)
        .then(res => res.json())
        .then(data => {
            const totalUsernames = data.length;
            const listedUsernames = data.filter(u => u.listed_status === 'listed').length;
            
            container.innerHTML = `
                <div class="profile-details-content">
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Informasi Akun</div>
                        <div>Nama: ${user.first_name || ''} ${user.last_name || ''}</div>
                        <div>Username: ${user.username ? '@' + user.username : '-'}</div>
                        <div>ID: ${user.id}</div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Statistik Username</div>
                        <div>Total Username: ${totalUsernames}</div>
                        <div>Listed: ${listedUsernames}</div>
                        <div>Unlisted: ${totalUsernames - listedUsernames}</div>
                    </div>
                    
                    <div>
                        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Daftar Username</div>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${data.map(u => `
                                <div style="padding: 8px; border-bottom: 1px solid var(--border-color); cursor: pointer;" onclick="showUsernameDetail('${u.username}')">
                                    <div>@${u.username}</div>
                                    <div style="font-size: 12px; color: var(--text-secondary);">
                                        ${u.listed_status === 'listed' ? '🟢 Listed' : '🔴 Unlisted'} | Rp ${(u.price || 0).toLocaleString('id-ID')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        })
        .catch(err => {
            console.error('Error loading user usernames:', err);
            container.innerHTML = `
                <div class="profile-details-content">
                    <div>Nama: ${user.first_name || ''} ${user.last_name || ''}</div>
                    <div>Username: ${user.username ? '@' + user.username : '-'}</div>
                    <div>ID: ${user.id}</div>
                </div>
            `;
        });
}

// Show username detail (placeholder for now)
function showUsernameDetail(username) {
    tg.showPopup({
        title: 'Detail Username',
        message: `@${username}\n\nFitur detail akan segera hadir!`,
        buttons: [{type: 'close'}]
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
    // Type buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.filters.type = btn.dataset.type;
            applyFilters();
        });
    });
    
    // Subtype buttons
    document.querySelectorAll('.subtype-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.subtype-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.filters.type = btn.dataset.subtype;
            
            // Also deactivate main type buttons
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
    
    // Reset loading state and reload market data
    appState.loadingStates.market = true;
    loadPageData('market');
}

// Debounce search input
let searchTimeout;
function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        applyFilters();
    }, 500);
}

// Setup scroll hide filter
function setupScrollHideFilter() {
    scrollContainer.addEventListener('scroll', () => {
        const scrollTop = scrollContainer.scrollTop;
        
        // Hide filter when scrolling down, show when scrolling up
        if (scrollTop > lastScrollTop && scrollTop > 50) {
            // Scrolling down
            if (filterVisible) {
                filterBar.classList.add('hidden');
                scrollContainer.classList.add('filter-hidden');
                filterVisible = false;
            }
        } else {
            // Scrolling up
            if (!filterVisible) {
                filterBar.classList.remove('hidden');
                scrollContainer.classList.remove('filter-hidden');
                filterVisible = true;
            }
        }
        
        lastScrollTop = scrollTop;
    });
}

// Setup pull visual (no refresh function)
function setupPullVisual() {
    scrollContainer.addEventListener('touchstart', (e) => {
        if (scrollContainer.scrollTop === 0) {
            touchStart = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });
    
    scrollContainer.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        
        touchMove = e.touches[0].clientY;
        const pullDistance = touchMove - touchStart;
        
        if (pullDistance > 0 && scrollContainer.scrollTop === 0) {
            e.preventDefault();
            
            // Visual feedback only, no refresh
            if (pullDistance < pullThreshold) {
                scrollContainer.classList.add('pulling');
                scrollContainer.classList.remove('pulling-max');
            } else {
                scrollContainer.classList.add('pulling-max');
            }
            
            // Add resistance effect
            scrollContainer.style.transform = `translateY(${Math.min(pullDistance * 0.3, 30)}px)`;
        }
    }, { passive: false });
    
    scrollContainer.addEventListener('touchend', () => {
        if (isPulling) {
            // Reset visual effects
            scrollContainer.classList.remove('pulling', 'pulling-max');
            scrollContainer.style.transform = '';
            isPulling = false;
        }
    });
    
    scrollContainer.addEventListener('touchcancel', () => {
        // Reset on cancel
        scrollContainer.classList.remove('pulling', 'pulling-max');
        scrollContainer.style.transform = '';
        isPulling = false;
    });
}

// Setup scroll blocker to prevent refresh
function setupScrollBlocker() {
    // Prevent default scroll behavior at the top
    scrollContainer.addEventListener('scroll', () => {
        if (scrollContainer.scrollTop < 0) {
            scrollContainer.scrollTop = 0;
        }
    });
    
    // Block any attempt to scroll beyond top
    scrollContainer.addEventListener('touchmove', (e) => {
        if (scrollContainer.scrollTop <= 0 && e.touches[0].clientY > touchStart) {
            e.preventDefault();
        }
    }, { passive: false });
}

// Make functions global
window.toggleFilterPanel = toggleFilterPanel;
window.debounceSearch = debounceSearch;
window.applyFilters = applyFilters;
window.showUsernameDetail = showUsernameDetail;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
