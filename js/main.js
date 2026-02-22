// Inisialisasi Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Konfigurasi BASE URL - Ganti dengan tunnel URL Anda
const BASE_URL = "https://daughters-configuration-replied-ethernet.trycloudflare.com";

// State Management
let currentUser = {
    id: 'guest',
    username: 'guest_user',
    firstName: 'Guest',
    photo: null,
    isAdmin: false
};

let usernames = [];
let filteredUsernames = [];
let currentFilters = {
    search: '',
    category: 'all',
    type: 'all',
    status: 'all',
    sort: 'newest',
    minPrice: 0,
    maxPrice: 1000
};

let isLoading = false;
let stats = {
    total: 0,
    available: 0,
    sold: 0,
    min_price: 0,
    max_price: 0
};

// ============= API FUNCTIONS =============

async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${BASE_URL}/api/${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include'
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        return null;
    }
}

// ============= USER AUTHENTICATION =============

async function initTelegramUser() {
    console.log('Initializing Telegram user...');
    
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        console.log('Telegram user data:', user);
        
        // Update currentUser dengan data dari Telegram
        currentUser = {
            id: user.id || 'guest',
            username: user.username || `user_${user.id}`,
            firstName: user.first_name || 'User',
            photo: user.photo_url || null,
            isAdmin: false
        };
        
        // Kirim ke server untuk penyimpanan (optional, jangan tunggu)
        try {
            const result = await apiRequest('init', 'POST', {
                user: {
                    id: user.id,
                    username: user.username,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    photo_url: user.photo_url,
                    language_code: user.language_code,
                    is_premium: user.is_premium || false
                }
            });
            
            if (result && result.status === 'authenticated') {
                currentUser.isAdmin = result.is_admin || false;
            }
        } catch (error) {
            console.error('Error sending user data to server:', error);
        }
    } else {
        console.log('No Telegram user data, using guest');
    }
    
    updateUserDisplay();
    console.log('Current user:', currentUser);
}

// Update tampilan user
function updateUserDisplay() {
    const displayName = document.getElementById('displayName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (displayName) {
        displayName.textContent = currentUser.username;
    }
    
    if (userAvatar) {
        if (currentUser.photo) {
            userAvatar.innerHTML = `<img src="${currentUser.photo}" alt="avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        } else {
            userAvatar.textContent = currentUser.firstName.charAt(0).toUpperCase();
        }
    }
}

// ============= DATA LOADING =============

async function loadUsernames() {
    // This would load from API, for now use mock data
    const mockUsernames = [
        { id: 1, name: 'Jennie', type: 'OP', category: 'idol', price: 250, status: 'available', original: 'Jennie', desc: 'Blackpink' },
        { id: 2, name: 'LisaS', type: 'SCANON', category: 'idol', price: 180, status: 'available', original: 'Lisa', desc: 'Blackpink + S' },
        { id: 3, name: 'Gojo', type: 'OP', category: 'anime', price: 320, status: 'available', original: 'Gojo', desc: 'JJK' },
        { id: 4, name: 'Mikay', type: 'OP', category: 'game', price: 140, status: 'available', original: 'Mikay', desc: 'Mobile Legends' },
    ];
    
    usernames = mockUsernames;
    applyFilters();
}

async function loadStats() {
    stats = {
        total: usernames.length,
        available: usernames.filter(u => u.status === 'available').length,
        sold: usernames.filter(u => u.status === 'sold').length,
        min_price: Math.min(...usernames.map(u => u.price)),
        max_price: Math.max(...usernames.map(u => u.price))
    };
    updateStats();
}

// Load data awal
async function loadData() {
    await loadUsernames();
    await loadStats();
}

// ============= FILTER FUNCTIONS =============

// Apply filters
function applyFilters() {
    filteredUsernames = usernames.filter(item => {
        // Search filter dengan fuzzy search
        if (currentFilters.search && currentFilters.search.trim() !== '') {
            const searchTerm = currentFilters.search.trim();
            if (!fuzzySearch(searchTerm, item.name) && !fuzzySearch(searchTerm, item.original || '')) {
                return false;
            }
        }
        
        // Category filter
        if (currentFilters.category !== 'all' && item.category !== currentFilters.category) return false;
        
        // Type filter
        if (currentFilters.type !== 'all' && item.type !== currentFilters.type) return false;
        
        // Status filter
        if (currentFilters.status !== 'all' && item.status !== currentFilters.status) return false;
        
        // Price filter
        if (item.price < currentFilters.minPrice || item.price > currentFilters.maxPrice) return false;
        
        return true;
    });
    
    applySort();
    updateActiveFilters();
    renderUsernames();
}

// Apply sorting
function applySort() {
    switch(currentFilters.sort) {
        case 'price_asc':
            filteredUsernames.sort((a, b) => a.price - b.price);
            break;
        case 'price_desc':
            filteredUsernames.sort((a, b) => b.price - a.price);
            break;
        case 'name_asc':
            filteredUsernames.sort((a, b) => a.name.localeCompare(b.name));
            break;
        default:
            filteredUsernames.sort((a, b) => b.id - a.id);
    }
}

// Update price range
function updatePriceRange() {
    if (usernames.length === 0) return;
    
    const prices = usernames.map(u => u.price);
    currentFilters.minPrice = stats.min_price || Math.min(...prices);
    currentFilters.maxPrice = stats.max_price || Math.max(...prices);
    
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    if (minPriceInput) minPriceInput.value = currentFilters.minPrice;
    if (maxPriceInput) maxPriceInput.value = currentFilters.maxPrice;
}

// Update active filters display
function updateActiveFilters() {
    const container = document.getElementById('activeFilters');
    if (!container) return;
    
    const filters = [];
    
    if (currentFilters.category !== 'all') {
        filters.push(`Category: ${getCategoryName(currentFilters.category)}`);
    }
    if (currentFilters.type !== 'all') {
        filters.push(`Type: ${currentFilters.type}`);
    }
    if (currentFilters.status !== 'all') {
        filters.push(`Status: ${currentFilters.status === 'available' ? 'Tersedia' : 'Terjual'}`);
    }
    if (currentFilters.minPrice > 0 || currentFilters.maxPrice < 1000) {
        filters.push(`Price: $${currentFilters.minPrice}-$${currentFilters.maxPrice}`);
    }
    if (currentFilters.sort !== 'newest') {
        const sortLabels = { 
            'price_asc': 'Harga Terendah', 
            'price_desc': 'Harga Tertinggi', 
            'name_asc': 'A-Z' 
        };
        filters.push(`Sort: ${sortLabels[currentFilters.sort]}`);
    }
    
    if (filters.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = filters.map(filter => `
        <span class="filter-tag">
            ${filter}
            <button onclick="removeFilter('${filter.split(':')[0].toLowerCase().trim()}')">×</button>
        </span>
    `).join('');
}

// ============= FUZZY SEARCH FUNCTIONS =============

function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function isSimilar(str1, str2, tolerance = 1) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    if (s1 === s2) return true;
    if (Math.abs(s1.length - s2.length) > tolerance) return false;
    return levenshteinDistance(s1, s2) <= tolerance;
}

function fuzzySearch(query, username) {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const u = username.toLowerCase();
    
    if (u === q) return true;
    if (u.includes(q)) return true;
    if (isSimilar(u, q)) return true;
    
    if (Math.abs(u.length - q.length) <= 1 && u.length > q.length) {
        for (let i = 0; i <= u.length - q.length; i++) {
            if (isSimilar(u.substring(i, i + q.length), q)) return true;
        }
    }
    return false;
}

// ============= RENDER FUNCTIONS =============

// Render username grid
function renderUsernames() {
    const grid = document.getElementById('usernameGrid');
    if (!grid) return;
    
    if (filteredUsernames.length === 0) {
        grid.innerHTML = '<div class="no-results">Tidak ada username ditemukan</div>';
        return;
    }
    
    grid.innerHTML = filteredUsernames.map(item => `
        <div class="username-card ${item.status}">
            <div class="username-name">@${item.name}</div>
            <div class="username-type">${item.type}</div>
            <div class="username-category">${getCategoryName(item.category)} • ${item.desc || ''}</div>
            <div class="username-details">
                <span class="username-price">${item.price}</span>
                <span class="username-status status-${item.status}">${item.status === 'available' ? 'Tersedia' : 'Terjual'}</span>
            </div>
        </div>
    `).join('');
}

// Get category name
function getCategoryName(category) {
    const categories = {
        'idol': 'Idol K-Pop', 
        'mulchar': 'Multichar', 
        'anime': 'Anime',
        'game': 'Game', 
        'common': 'Common', 
        'uncommon': 'Uncommon'
    };
    return categories[category] || category;
}

// Update stats display
function updateStats() {
    const totalCount = document.getElementById('totalCount');
    const availableCount = document.getElementById('availableCount');
    const soldCount = document.getElementById('soldCount');
    const minPriceStat = document.getElementById('minPriceStat');
    const maxPriceStat = document.getElementById('maxPriceStat');
    
    if (totalCount) totalCount.textContent = stats.total || 0;
    if (availableCount) availableCount.textContent = stats.available || 0;
    if (soldCount) soldCount.textContent = stats.sold || 0;
    if (minPriceStat) minPriceStat.textContent = `$${stats.min_price || 0}`;
    if (maxPriceStat) maxPriceStat.textContent = `$${stats.max_price || 0}`;
}

// ============= UI FUNCTIONS =============

function showLoading(show) {
    // Optional - bisa diisi jika diperlukan
}

// Toggle filter panel
function toggleFilterPanel() {
    const panel = document.getElementById('filterPanel');
    const overlay = document.getElementById('filterOverlay');
    if (!panel || !overlay) return;
    
    panel.classList.toggle('show');
    overlay.classList.toggle('show');
    document.body.style.overflow = panel.classList.contains('show') ? 'hidden' : 'auto';
}

// Update filter UI active states
function updateFilterUI() {
    document.querySelectorAll('[data-sort]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sort === currentFilters.sort);
    });
    document.querySelectorAll('[data-category]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === currentFilters.category);
    });
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === currentFilters.type);
    });
    document.querySelectorAll('[data-status]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === currentFilters.status);
    });
    
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    if (minPriceInput) minPriceInput.value = currentFilters.minPrice;
    if (maxPriceInput) maxPriceInput.value = currentFilters.maxPrice;
}

// Reset filters
function resetFilters() {
    currentFilters = {
        search: '', 
        category: 'all', 
        type: 'all', 
        status: 'all',
        sort: 'newest',
        minPrice: stats.min_price || 0,
        maxPrice: stats.max_price || 1000
    };
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    updateFilterUI();
    applyFilters();
    toggleFilterPanel();
}

// ============= SEARCH SUGGESTIONS =============

function updateSearchSuggestion() {
    const searchInput = document.getElementById('searchInput');
    let suggestionBox = document.getElementById('searchSuggestion');
    
    if (!suggestionBox && searchInput) {
        suggestionBox = document.createElement('div');
        suggestionBox.id = 'searchSuggestion';
        suggestionBox.className = 'search-suggestion';
        searchInput.parentNode.appendChild(suggestionBox);
    }
    
    if (!suggestionBox) return;
    
    if (!currentFilters.search || currentFilters.search.length < 2) {
        suggestionBox.style.display = 'none';
        return;
    }
    
    const suggestions = usernames
        .filter(item => fuzzySearch(currentFilters.search, item.name))
        .map(item => item.name)
        .filter((v, i, s) => s.indexOf(v) === i)
        .slice(0, 5);
    
    if (suggestions.length === 0) {
        suggestionBox.style.display = 'none';
        return;
    }
    
    suggestionBox.innerHTML = suggestions.map(s => 
        `<div class="suggestion-item" onclick="selectSuggestion('${s.replace(/'/g, "\\'")}')">@${s}</div>`
    ).join('');
    
    suggestionBox.style.display = 'block';
}

window.selectSuggestion = (suggestion) => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = suggestion;
    currentFilters.search = suggestion;
    applyFilters();
    const box = document.getElementById('searchSuggestion');
    if (box) box.style.display = 'none';
};

// Remove filter
window.removeFilter = (filterType) => {
    switch(filterType) {
        case 'category': 
            currentFilters.category = 'all'; 
            break;
        case 'type': 
            currentFilters.type = 'all'; 
            break;
        case 'status': 
            currentFilters.status = 'all'; 
            break;
        case 'price':
            currentFilters.minPrice = stats.min_price || 0;
            currentFilters.maxPrice = stats.max_price || 1000;
            break;
        case 'sort': 
            currentFilters.sort = 'newest'; 
            break;
    }
    updateFilterUI();
    applyFilters();
};

// ============= ACCORDION INITIALIZATION =============

function initFilterAccordion() {
    const filterGroups = document.querySelectorAll('.filter-group');
    
    filterGroups.forEach(group => {
        const label = group.querySelector('.filter-label');
        const options = group.querySelector('.filter-options, .price-range');
        if (!label || !options) return;
        
        if (group.querySelector('.filter-group-header')) return;
        
        const header = document.createElement('div');
        header.className = 'filter-group-header';
        
        const arrow = document.createElement('span');
        arrow.className = 'arrow';
        arrow.innerHTML = '▼';
        
        label.parentNode.removeChild(label);
        header.appendChild(label);
        header.appendChild(arrow);
        
        const content = document.createElement('div');
        content.className = 'filter-group-content';
        options.parentNode.insertBefore(content, options);
        content.appendChild(options);
        
        group.insertBefore(header, content);
        
        content.classList.remove('show');
        header.classList.remove('active');
        
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            header.classList.toggle('active');
            content.classList.toggle('show');
        });
    });
}

function initClearSearchButton() {
    const searchInput = document.getElementById('searchInput');
    const clearButton = document.getElementById('clearSearch');
    
    if (searchInput && clearButton) {
        searchInput.addEventListener('input', () => {
            clearButton.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
        });
        
        clearButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            searchInput.value = '';
            clearButton.style.display = 'none';
            currentFilters.search = '';
            applyFilters();
            searchInput.focus();
            const box = document.getElementById('searchSuggestion');
            if (box) box.style.display = 'none';
        });
    }
}

// ============= MAIN INITIALIZATION =============

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded - main.js');
    
    // Inisialisasi user TERLEBIH DAHULU
    await initTelegramUser();
    
    // Load data
    await loadData();
    updatePriceRange();
    
    // Filter toggle
    const filterToggle = document.getElementById('filterToggle');
    const closeFilter = document.getElementById('closeFilter');
    const filterOverlay = document.getElementById('filterOverlay');
    
    if (filterToggle) filterToggle.addEventListener('click', toggleFilterPanel);
    if (closeFilter) closeFilter.addEventListener('click', toggleFilterPanel);
    if (filterOverlay) filterOverlay.addEventListener('click', toggleFilterPanel);
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentFilters.search = e.target.value;
                applyFilters();
                updateSearchSuggestion();
            }, 300);
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                currentFilters.search = e.target.value;
                applyFilters();
                const box = document.getElementById('searchSuggestion');
                if (box) box.style.display = 'none';
            }
        });
    }
    
    // Search button
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const input = document.getElementById('searchInput');
            if (input) {
                currentFilters.search = input.value;
                applyFilters();
                const box = document.getElementById('searchSuggestion');
                if (box) box.style.display = 'none';
            }
        });
    }
    
    // Click outside to close suggestion
    document.addEventListener('click', (e) => {
        const input = document.getElementById('searchInput');
        const box = document.getElementById('searchSuggestion');
        if (box && input && !input.contains(e.target) && !box.contains(e.target)) {
            box.style.display = 'none';
        }
    });
    
    // Sort options
    document.querySelectorAll('[data-sort]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-sort]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.sort = btn.dataset.sort;
            applySort();
        });
    });
    
    // Category options
    document.querySelectorAll('[data-category]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-category]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.category = btn.dataset.category;
            applyFilters();
        });
    });
    
    // Type options
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.type = btn.dataset.type;
            applyFilters();
        });
    });
    
    // Status options
    document.querySelectorAll('[data-status]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-status]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.status = btn.dataset.status;
            applyFilters();
        });
    });
    
    // Apply filters button
    const applyBtn = document.getElementById('applyFilters');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            const minPrice = document.getElementById('minPrice');
            const maxPrice = document.getElementById('maxPrice');
            currentFilters.minPrice = parseInt(minPrice?.value) || 0;
            currentFilters.maxPrice = parseInt(maxPrice?.value) || 1000;
            applyFilters();
            toggleFilterPanel();
        });
    }
    
    // Reset filters button
    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    
    // Inisialisasi komponen UI
    setTimeout(() => {
        initFilterAccordion();
        initClearSearchButton();
    }, 100);
});

// ============= DEBUG =============

window.debug = {
    getCurrentUser: () => currentUser,
    getFilters: () => currentFilters,
    getUsernames: () => usernames,
    getStats: () => stats
};
