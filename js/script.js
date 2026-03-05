// script.js - Main frontend logic

// Initialize Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Expand to full height

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
const scrollContainer = document.getElementById('scrollContainer');
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const appTitle = document.getElementById('appTitle');
const userInfo = document.getElementById('userInfo');

// Pull visual variables (no refresh function)
let touchStart = 0;
let touchMove = 0;
let isPulling = false;
let pullThreshold = 60;

// Initialize app
async function initApp() {
    // Set app title
    appTitle.textContent = window.CONFIG?.APP_NAME || 'MiniApp';
    
    // Detect Telegram user
    await detectTelegramUser();
    
    // Set up event listeners
    setupNavigation();
    setupPullVisual();
    setupScrollBlocker();
    
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
    const container = document.getElementById(`${page}Items`) || document.getElementById(`${page}Details`);
    if (!container) return;
    
    // Show loading state
    showLoadingState(container, page);
    
    try {
        // Simulate API call with mock data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data
        let data;
        switch(page) {
            case 'market':
                data = [
                    { name: 'Item 1', price: 10.99 },
                    { name: 'Item 2', price: 24.99 },
                    { name: 'Item 3', price: 5.99 },
                    { name: 'Item 4', price: 15.50 }
                ];
                break;
            case 'games':
                data = [
                    { name: 'Game 1' },
                    { name: 'Game 2' },
                    { name: 'Game 3' },
                    { name: 'Game 4' }
                ];
                break;
            case 'activity':
                data = [
                    { time: '2 menit lalu', description: 'Aktivitas 1' },
                    { time: '1 jam lalu', description: 'Aktivitas 2' },
                    { time: 'Kemarin', description: 'Aktivitas 3' }
                ];
                break;
            case 'profile':
                data = { balance: '1000', joined: '2024' };
                break;
        }
        
        appState.data[page] = data;
        appState.loadingStates[page] = false;
        renderPageData(page, data);
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
        market: 'Tidak ada item di market',
        games: 'Tidak ada game tersedia',
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
                    <div class="activity-time">${activity.time || 'Baru saja'}</div>
                    <div>${activity.description || 'Aktivitas'}</div>
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
            <div>Saldo: ${profile.balance || '0'}</div>
            <div>Bergabung: ${profile.joined || 'Baru-baru ini'}</div>
        </div>
    `;
    container.innerHTML = html;
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

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
