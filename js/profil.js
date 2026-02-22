// Inisialisasi Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// State Management
let currentUser = {
    id: 'guest',
    username: 'guest_user',
    firstName: 'Guest',
    photo: null
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

// Data dummy usernames (sama dengan sebelumnya)
const dummyUsernames = [
    // IDOL K-POP
    { id: 1, name: 'Jennie', type: 'OP', category: 'idol', price: 250, status: 'available', original: 'Jennie', desc: 'Blackpink' },
    { id: 2, name: 'LisaS', type: 'SCANON', category: 'idol', price: 180, status: 'available', original: 'Lisa', desc: 'Blackpink + S' },
    { id: 3, name: 'JaeminNa', type: 'OP', category: 'idol', price: 220, status: 'sold', original: 'Na Jaemin', desc: 'NCT' },
    { id: 4, name: 'WiinWin', type: 'SOP', category: 'idol', price: 150, status: 'available', original: 'Winwin', desc: 'NCT/WayV' },
    { id: 5, name: 'Markiee', type: 'CANON', category: 'idol', price: 190, status: 'available', original: 'Mark', desc: 'NCT (I to L)' },
    
    // MULTICHAR
    { id: 6, name: 'StrayKidz', type: 'TAMPING', category: 'mulchar', price: 300, status: 'available', original: 'Stray Kids', desc: 'Tambahan z' },
    { id: 7, name: 'Enhypen', type: 'OP', category: 'mulchar', price: 400, status: 'sold', original: 'Enhypen', desc: 'Original' },
    { id: 8, name: 'TXTbighit', type: 'TAMDAL', category: 'mulchar', price: 280, status: 'available', original: 'TXT', desc: 'Tambah dal bighit' },
    { id: 9, name: 'SVTcarats', type: 'GANHUR', category: 'mulchar', price: 260, status: 'available', original: 'SEVENTEEN', desc: 'Ganti huruf' },
    
    // ANIME
    { id: 10, name: 'GojoSatoru', type: 'OP', category: 'anime', price: 350, status: 'available', original: 'Gojo Satoru', desc: 'JJK' },
    { id: 11, name: 'Lelouch', type: 'CANON', category: 'anime', price: 200, status: 'available', original: 'Lelouch', desc: 'Code Geass' },
    { id: 12, name: 'RoronoaZ', type: 'SCANON', category: 'anime', price: 180, status: 'sold', original: 'Roronoa Zoro', desc: 'One Piece' },
    { id: 13, name: 'NarutoUzumaki', type: 'OP', category: 'anime', price: 450, status: 'available', original: 'Naruto Uzumaki', desc: 'Naruto' },
    { id: 14, name: 'LeviAckermanS', type: 'SCANON', category: 'anime', price: 320, status: 'available', original: 'Levi Ackerman', desc: 'AOT + S' },
    
    // GAME
    { id: 15, name: 'Mikayy', type: 'SOP', category: 'game', price: 140, status: 'available', original: 'Mikay', desc: 'Mobile Legends' },
    { id: 16, name: 'Claude', type: 'OP', category: 'game', price: 280, status: 'available', original: 'Claude', desc: 'MLBB' },
    { id: 17, name: 'GusionP', type: 'TAMPING', category: 'game', price: 160, status: 'sold', original: 'Gusion', desc: 'Tambah P' },
    { id: 18, name: 'Lingg', type: 'KURHUF', category: 'game', price: 120, status: 'available', original: 'Ling', desc: 'Kurang 1 huruf' },
    { id: 19, name: 'Chouu', type: 'SOP', category: 'game', price: 150, status: 'available', original: 'Chou', desc: 'Double u' },
    
    // COMMON
    { id: 20, name: 'aRose', type: 'TAMPING', category: 'common', price: 90, status: 'available', original: 'Rose', desc: 'Tamping depan' },
    { id: 21, name: 'Jisooy', type: 'TAMPING', category: 'common', price: 95, status: 'available', original: 'Jisoo', desc: 'Tamping belakang y' },
    { id: 22, name: 'AhyeRon', type: 'TAMDAL', category: 'common', price: 110, status: 'sold', original: 'Ahyeon', desc: 'Tamdal R' },
    { id: 23, name: 'PharitY', type: 'GANHUR', category: 'common', price: 85, status: 'available', original: 'Pharita', desc: 'Ganti A ke Y' },
    { id: 24, name: 'Roar', type: 'SWITCH', category: 'common', price: 130, status: 'available', original: 'Rora', desc: 'Switch huruf' },
    
    // UNCOMMON
    { id: 25, name: 'Wonyoung', type: 'OP', category: 'uncommon', price: 380, status: 'available', original: 'Wonyoung', desc: 'IVE' },
    { id: 26, name: 'SakuraS', type: 'SCANON', category: 'uncommon', price: 270, status: 'available', original: 'Sakura', desc: 'Le Sserafim + S' },
    { id: 27, name: 'JaemLn', type: 'CANON', category: 'uncommon', price: 290, status: 'sold', original: 'Jaemin', desc: 'I to L' },
    { id: 28, name: 'Jinniie', type: 'SOP', category: 'uncommon', price: 230, status: 'available', original: 'Jinni', desc: 'NMIXX' },
];

// Inisialisasi Telegram User
function initTelegramUser() {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        currentUser = {
            id: user.id || 'guest',
            username: user.username || `user_${user.id}`,
            firstName: user.first_name || 'User',
            photo: user.photo_url || null
        };
    }
    
    updateUserDisplay();
}

// Update tampilan user
function updateUserDisplay() {
    const displayName = document.getElementById('displayName');
    const userAvatar = document.getElementById('userAvatar');
    
    displayName.textContent = currentUser.username;
    
    if (currentUser.photo) {
        userAvatar.innerHTML = `<img src="${currentUser.photo}" alt="avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
        userAvatar.textContent = currentUser.firstName.charAt(0).toUpperCase();
    }
}

// Load data
function loadData() {
    usernames = dummyUsernames;
    updatePriceRange();
    applyFilters();
    updateStats();
}

// Update price range from data
function updatePriceRange() {
    const prices = usernames.map(u => u.price);
    currentFilters.minPrice = Math.min(...prices);
    currentFilters.maxPrice = Math.max(...prices);
    
    document.getElementById('minPrice').value = currentFilters.minPrice;
    document.getElementById('maxPrice').value = currentFilters.maxPrice;
}

// Apply filters
function applyFilters() {
    filteredUsernames = usernames.filter(item => {
        // Search filter
        if (currentFilters.search && !item.name.toLowerCase().includes(currentFilters.search.toLowerCase()) &&
            !item.original.toLowerCase().includes(currentFilters.search.toLowerCase())) {
            return false;
        }
        
        // Category filter
        if (currentFilters.category !== 'all' && item.category !== currentFilters.category) {
            return false;
        }
        
        // Type filter
        if (currentFilters.type !== 'all' && item.type !== currentFilters.type) {
            return false;
        }
        
        // Status filter
        if (currentFilters.status !== 'all' && item.status !== currentFilters.status) {
            return false;
        }
        
        // Price filter
        if (item.price < currentFilters.minPrice || item.price > currentFilters.maxPrice) {
            return false;
        }
        
        return true;
    });
    
    // Apply sorting
    applySort();
    updateActiveFilters();
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
        default: // newest (by id)
            filteredUsernames.sort((a, b) => b.id - a.id);
    }
    
    renderUsernames();
}

// Render username grid
function renderUsernames() {
    const grid = document.getElementById('usernameGrid');
    
    if (filteredUsernames.length === 0) {
        grid.innerHTML = '<div class="no-results">Tidak ada username ditemukan</div>';
        return;
    }
    
    grid.innerHTML = filteredUsernames.map(item => `
        <div class="username-card ${item.status}">
            <div class="username-name">@${item.name}</div>
            <div class="username-type">${item.type}</div>
            <div class="username-category">${getCategoryName(item.category)} • ${item.desc}</div>
            <div class="username-details">
                <span class="username-price">${item.price}</span>
                <span class="username-status status-${item.status}">${item.status === 'available' ? 'Tersedia' : 'Terjual'}</span>
            </div>
        </div>
    `).join('');
}

// Get category display name
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

// Update stats
function updateStats() {
    const totalCount = document.getElementById('totalCount');
    const availableCount = document.getElementById('availableCount');
    const soldCount = document.getElementById('soldCount');
    const minPriceStat = document.getElementById('minPriceStat');
    const maxPriceStat = document.getElementById('maxPriceStat');
    
    totalCount.textContent = usernames.length;
    availableCount.textContent = usernames.filter(u => u.status === 'available').length;
    soldCount.textContent = usernames.filter(u => u.status === 'sold').length;
    
    const prices = usernames.map(u => u.price);
    minPriceStat.textContent = `$${Math.min(...prices)}`;
    maxPriceStat.textContent = `$${Math.max(...prices)}`;
}

// Update active filters display
function updateActiveFilters() {
    const container = document.getElementById('activeFilters');
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

// Toggle filter panel
function toggleFilterPanel() {
    const panel = document.getElementById('filterPanel');
    const overlay = document.getElementById('filterOverlay');
    panel.classList.toggle('show');
    overlay.classList.toggle('show');
    
    // Prevent body scroll when panel is open
    if (panel.classList.contains('show')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
}

// Update filter UI active states
function updateFilterUI() {
    // Update sort buttons
    document.querySelectorAll('[data-sort]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sort === currentFilters.sort);
    });
    
    // Update category buttons
    document.querySelectorAll('[data-category]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === currentFilters.category);
    });
    
    // Update type buttons
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === currentFilters.type);
    });
    
    // Update status buttons
    document.querySelectorAll('[data-status]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === currentFilters.status);
    });
    
    // Update price inputs
    document.getElementById('minPrice').value = currentFilters.minPrice;
    document.getElementById('maxPrice').value = currentFilters.maxPrice;
}

// Reset all filters
function resetFilters() {
    currentFilters = {
        search: '',
        category: 'all',
        type: 'all',
        status: 'all',
        sort: 'newest',
        minPrice: Math.min(...usernames.map(u => u.price)),
        maxPrice: Math.max(...usernames.map(u => u.price))
    };
    
    document.getElementById('searchInput').value = '';
    updateFilterUI();
    applyFilters();
    toggleFilterPanel();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initTelegramUser();
    loadData();
    
    // Filter toggle
    document.getElementById('filterToggle').addEventListener('click', toggleFilterPanel);
    document.getElementById('closeFilter').addEventListener('click', toggleFilterPanel);
    document.getElementById('filterOverlay').addEventListener('click', toggleFilterPanel);
    
    // Search button
    document.getElementById('searchBtn').addEventListener('click', () => {
        currentFilters.search = document.getElementById('searchInput').value;
        applyFilters();
    });
    
    // Search on enter
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentFilters.search = e.target.value;
            applyFilters();
        }
    });
    
    // Sort options
    document.querySelectorAll('[data-sort]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-sort]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.sort = btn.dataset.sort;
        });
    });
    
    // Category options
    document.querySelectorAll('[data-category]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-category]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.category = btn.dataset.category;
        });
    });
    
    // Type options
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.type = btn.dataset.type;
        });
    });
    
    // Status options
    document.querySelectorAll('[data-status]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-status]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.status = btn.dataset.status;
        });
    });
    
    // Apply filters button
    document.getElementById('applyFilters').addEventListener('click', () => {
        currentFilters.minPrice = parseInt(document.getElementById('minPrice').value) || 0;
        currentFilters.maxPrice = parseInt(document.getElementById('maxPrice').value) || 1000;
        applyFilters();
        toggleFilterPanel();
    });
    
    // Reset filters button
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
});

// Remove specific filter (called from filter tags)
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
            currentFilters.minPrice = Math.min(...usernames.map(u => u.price));
            currentFilters.maxPrice = Math.max(...usernames.map(u => u.price));
            break;
        case 'sort':
            currentFilters.sort = 'newest';
            break;
    }
    
    updateFilterUI();
    applyFilters();
};

// Export untuk debugging
window.debug = {
    getCurrentUser: () => currentUser,
    getFilters: () => currentFilters,
    getUsernames: () => usernames
};
