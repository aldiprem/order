// script.js - Main frontend logic

// Initialize Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Expand to full height
tg.enableClosingConfirmation();

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
    }
};

// DOM Elements
const mainContent = document.getElementById('mainContent');
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const appTitle = document.getElementById('appTitle');
const userInfo = document.getElementById('userInfo');
const pullToRefresh = document.querySelector('.pull-to-refresh');

// Pull to refresh functionality
let touchStart = 0;
let touchMove = 0;
let isPulling = false;
let refreshThreshold = window.CONFIG?.PULL_TO_REFRESH_THRESHOLD || 80;

// Initialize app
async function initApp() {
    // Set app title
    appTitle.textContent = window.CONFIG?.APP_NAME || 'MiniApp';
    
    // Detect Telegram user
    await detectTelegramUser();
    
    // Set up event listeners
    setupNavigation();
    setupPullToRefresh();
    setupScrollHandling();
    
    // Load initial page data
    loadPageData('market');
    
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
            
            // Verify with backend
            await verifyUserWithBackend(user);
        } else {
            renderUserInfo(null);
        }
    } catch (error) {
        console.error('Error detecting user:', error);
        renderUserInfo(null);
    }
}

// Verify user with backend
async function verifyUserWithBackend(user) {
    try {
        const response = await fetch(`${window.CONFIG?.API_BASE_URL}/api/verify-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('User verified:', data);
        }
    } catch (error) {
        console.error('Backend verification failed:', error);
    }
}

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
    const container = document.getElementById(`${page}Items`);
    if (!container) return;
    
    // Show loading state
    showLoadingState(container, page);
    
    try {
        // Fetch data from backend
        const response = await fetch(`${window.CONFIG?.API_BASE_URL}/api/${page}`);
        
        if (response.ok) {
            const data = await response.json();
            appState.data[page] = data;
            appState.loadingStates[page] = false;
            renderPageData(page, data);
        } else {
            throw new Error('Failed to fetch data');
        }
    } catch (error) {
        console.error(`Error loading ${page} data:`, error);
        showEmptyState(container, page);
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
        market: 'No items available in market',
        games: 'No games available',
        activity: 'No activity yet',
        profile: 'No profile information'
    };
    
    container.innerHTML = `
        <div class="empty-state">
            ${messages[page] || 'No data available'}
        </div>
    `;
}

// Render page data
function renderPageData(page, data) {
    const container = document.getElementById(`${page}Items`);
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
        <div class="market-grid">
            ${items.map(item => `
                <div class="market-item">
                    <div class="market-item-title">${item.name || 'Item'}</div>
                    <div class="market-item-price">$${item.price || '0.00'}</div>
                </div>
            `).join('')}
        </div>
    `;
    container.innerHTML = html;
}

// Render games data
function renderGamesData(container, games) {
    const html = `
        <div class="games-grid">
            ${games.map(game => `
                <div class="game-item">
                    <div>${game.name || 'Game'}</div>
                </div>
            `).join('')}
        </div>
    `;
    container.innerHTML = html;
}

// Render activity data
function renderActivityData(container, activities) {
    const html = `
        <div class="activity-list">
            ${activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-time">${activity.time || 'Just now'}</div>
                    <div>${activity.description || 'Activity'}</div>
                </div>
            `).join('')}
        </div>
    `;
    container.innerHTML = html;
}

// Render profile data
function renderProfileData(container, profile) {
    const html = `
        <div class="profile-details-content">
            <div>Balance: ${profile.balance || '0'}</div>
            <div>Joined: ${profile.joined || 'Recently'}</div>
        </div>
    `;
    container.innerHTML = html;
}

// Setup pull to refresh
function setupPullToRefresh() {
    mainContent.addEventListener('touchstart', (e) => {
        if (mainContent.scrollTop === 0) {
            touchStart = e.touches[0].clientY;
            isPulling = true;
        }
    });
    
    mainContent.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        
        touchMove = e.touches[0].clientY;
        const pullDistance = touchMove - touchStart;
        
        if (pullDistance > 0 && pullDistance < refreshThreshold) {
            e.preventDefault();
            pullToRefresh.style.transform = `translateY(${Math.min(pullDistance, 60)}px)`;
        }
        
        if (pullDistance >= refreshThreshold) {
            pullToRefresh.classList.add('active');
        }
    });
    
    mainContent.addEventListener('touchend', () => {
        if (isPulling) {
            const pullDistance = touchMove - touchStart;
            
            if (pullDistance >= refreshThreshold) {
                refreshPage();
            }
            
            // Reset
            pullToRefresh.style.transform = '';
            pullToRefresh.classList.remove('active');
            isPulling = false;
        }
    });
}

// Refresh page
async function refreshPage() {
    pullToRefresh.classList.add('refreshing');
    
    // Reset loading states for current page
    appState.loadingStates[appState.currentPage] = true;
    
    // Reload current page data
    await loadPageData(appState.currentPage);
    
    // Re-detect user
    await detectTelegramUser();
    
    pullToRefresh.classList.remove('refreshing');
}

// Setup scroll handling
function setupScrollHandling() {
    mainContent.addEventListener('scroll', () => {
        // Prevent Telegram mini app from closing when scrolling to top
        if (mainContent.scrollTop <= 0) {
            mainContent.scrollTop = 1;
        }
    });
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
