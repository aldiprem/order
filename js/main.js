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

// Data dummy usernames (ditambah dengan variasi untuk testing)
const dummyUsernames = [
    // IDOL K-POP
    { id: 1, name: 'Jennie', type: 'OP', category: 'idol', price: 250, status: 'available', original: 'Jennie', desc: 'Blackpink' },
    { id: 2, name: 'Jennies', type: 'SCANON', category: 'idol', price: 180, status: 'available', original: 'Jennie', desc: 'Blackpink + S' },
    { id: 3, name: 'Jenie', type: 'KURHUF', category: 'idol', price: 150, status: 'available', original: 'Jennie', desc: 'Kurang 1 huruf' },
    { id: 4, name: 'Jeenie', type: 'GANHUR', category: 'idol', price: 170, status: 'available', original: 'Jennie', desc: 'Ganti huruf' },
    { id: 5, name: 'Jjenie', type: 'TAMPING', category: 'idol', price: 160, status: 'available', original: 'Jennie', desc: 'Tambah J' },
    
    { id: 6, name: 'Lisa', type: 'OP', category: 'idol', price: 230, status: 'available', original: 'Lisa', desc: 'Blackpink' },
    { id: 7, name: 'Lisas', type: 'SCANON', category: 'idol', price: 180, status: 'available', original: 'Lisa', desc: 'Blackpink + S' },
    { id: 8, name: 'Lisia', type: 'GANHUR', category: 'idol', price: 160, status: 'available', original: 'Lisa', desc: 'Ganti huruf' },
    { id: 9, name: 'Lissa', type: 'SOP', category: 'idol', price: 170, status: 'available', original: 'Lisa', desc: 'Double S' },
    
    { id: 10, name: 'Jiso', type: 'KURHUF', category: 'idol', price: 140, status: 'available', original: 'Jisoo', desc: 'Kurang 1 huruf' },
    { id: 11, name: 'Jisoo', type: 'OP', category: 'idol', price: 240, status: 'available', original: 'Jisoo', desc: 'Blackpink' },
    { id: 12, name: 'Jisoos', type: 'SCANON', category: 'idol', price: 190, status: 'available', original: 'Jisoo', desc: 'Blackpink + S' },
    
    // MULTICHAR
    { id: 13, name: 'StrayKids', type: 'OP', category: 'mulchar', price: 400, status: 'available', original: 'Stray Kids', desc: 'Original' },
    { id: 14, name: 'StrayKidz', type: 'TAMPING', category: 'mulchar', price: 300, status: 'available', original: 'Stray Kids', desc: 'Tambahan z' },
    { id: 15, name: 'StrayKid', type: 'KURHUF', category: 'mulchar', price: 280, status: 'available', original: 'Stray Kids', desc: 'Kurang s' },
    
    // ANIME
    { id: 16, name: 'Gojo', type: 'OP', category: 'anime', price: 320, status: 'available', original: 'Gojo', desc: 'JJK' },
    { id: 17, name: 'Gojos', type: 'SCANON', category: 'anime', price: 280, status: 'available', original: 'Gojo', desc: 'JJK + S' },
    { id: 18, name: 'Gojoo', type: 'SOP', category: 'anime', price: 290, status: 'available', original: 'Gojo', desc: 'Double o' },
    
    { id: 19, name: 'Naruto', type: 'OP', category: 'anime', price: 450, status: 'available', original: 'Naruto', desc: 'Naruto' },
    { id: 20, name: 'Narutos', type: 'SCANON', category: 'anime', price: 380, status: 'available', original: 'Naruto', desc: 'Naruto + S' },
    { id: 21, name: 'Narutoo', type: 'SOP', category: 'anime', price: 400, status: 'available', original: 'Naruto', desc: 'Double o' },
    
    // GAME
    { id: 22, name: 'Mikay', type: 'OP', category: 'game', price: 140, status: 'available', original: 'Mikay', desc: 'Mobile Legends' },
    { id: 23, name: 'Mikayy', type: 'SOP', category: 'game', price: 150, status: 'available', original: 'Mikay', desc: 'Double y' },
    { id: 24, name: 'Mikays', type: 'SCANON', category: 'game', price: 130, status: 'available', original: 'Mikay', desc: '+ S' },
    
    { id: 25, name: 'Claude', type: 'OP', category: 'game', price: 280, status: 'available', original: 'Claude', desc: 'MLBB' },
    { id: 26, name: 'Claudes', type: 'SCANON', category: 'game', price: 240, status: 'available', original: 'Claude', desc: '+ S' },
    
    // COMMON - Testing untuk kata "ayam"
    { id: 27, name: 'bayam', type: 'TAMPING', category: 'common', price: 50, status: 'available', original: 'ayam', desc: 'Tambah b di depan' },
    { id: 28, name: 'aykam', type: 'GANHUR', category: 'common', price: 45, status: 'available', original: 'ayam', desc: 'Ganti a ke k' },
    { id: 29, name: 'ayyam', type: 'SOP', category: 'common', price: 55, status: 'available', original: 'ayam', desc: 'Double y' },
    { id: 30, name: 'ayam', type: 'OP', category: 'common', price: 60, status: 'available', original: 'ayam', desc: 'Original' },
    { id: 31, name: 'ayams', type: 'SCANON', category: 'common', price: 48, status: 'available', original: 'ayam', desc: '+ S' },
    
    // COMMON - Testing untuk kata "babi"
    { id: 32, name: 'bkabi', type: 'GANHUR', category: 'common', price: 45, status: 'available', original: 'babi', desc: 'Ganti a ke k' },
    { id: 33, name: 'bbabi', type: 'TAMPING', category: 'common', price: 50, status: 'available', original: 'babi', desc: 'Tambah b di depan' },
    { id: 34, name: 'ababi', type: 'TAMPING', category: 'common', price: 48, status: 'available', original: 'babi', desc: 'Tambah a di depan' },
    { id: 35, name: 'babi', type: 'OP', category: 'common', price: 60, status: 'available', original: 'babi', desc: 'Original' },
    { id: 36, name: 'babis', type: 'SCANON', category: 'common', price: 52, status: 'available', original: 'babi', desc: '+ S' },
    { id: 37, name: 'baabi', type: 'SOP', category: 'common', price: 55, status: 'available', original: 'babi', desc: 'Double a' },
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

/**
 * Fungsi untuk mengecek apakah dua string mirip dengan toleransi 1 perubahan
 * Perubahan yang diperbolehkan:
 * 1. Tambah 1 huruf
 * 2. Kurang 1 huruf
 * 3. Ganti 1 huruf
 */
function isSimilar(str1, str2, tolerance = 1) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Jika sama persis
    if (s1 === s2) return true;
    
    // Hitung selisih panjang
    const lenDiff = Math.abs(s1.length - s2.length);
    
    // Jika selisih panjang lebih dari tolerance, tidak mungkin mirip
    if (lenDiff > tolerance) return false;
    
    // Cek dengan Levenshtein Distance (edit distance)
    const distance = levenshteinDistance(s1, s2);
    return distance <= tolerance;
}

/**
 * Menghitung Levenshtein Distance (edit distance) antara dua string
 * Edit distance: jumlah minimum operasi (insert, delete, replace) untuk mengubah string1 menjadi string2
 */
function levenshteinDistance(a, b) {
    const matrix = [];
    
    // Inisialisasi matrix
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    
    // Hitung distance
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // replace
                    matrix[i][j - 1] + 1,     // insert
                    matrix[i - 1][j] + 1      // delete
                );
            }
        }
    }
    
    return matrix[b.length][a.length];
}

/**
 * Fungsi pencarian fuzzy yang mencari username berdasarkan:
 * - Exact match
 * - Contains (mengandung kata)
 * - Similar dengan tolerance 1 perubahan
 */
function fuzzySearch(query, username) {
    if (!query) return true;
    
    const q = query.toLowerCase().trim();
    const u = username.toLowerCase();
    
    // Exact match
    if (u === q) return true;
    
    // Contains (mengandung kata)
    if (u.includes(q)) return true;
    
    // Similar dengan tolerance 1 perubahan
    if (isSimilar(u, q)) return true;
    
    // Cek juga apakah username mengandung kata yang mirip
    // Misal: "jennie" dengan "jennies" (mirip)
    // Atau "jennie" dengan "jenn" (mirip)
    if (Math.abs(u.length - q.length) <= 1) {
        // Untuk username yang lebih panjang, cek apakah query mirip dengan bagian dari username
        if (u.length > q.length) {
            for (let i = 0; i <= u.length - q.length; i++) {
                const substring = u.substring(i, i + q.length);
                if (isSimilar(substring, q)) {
                    return true;
                }
            }
        }
    }
    
    return false;
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
    
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    
    if (minPriceInput) minPriceInput.value = currentFilters.minPrice;
    if (maxPriceInput) maxPriceInput.value = currentFilters.maxPrice;
}

// Apply filters
function applyFilters() {
    filteredUsernames = usernames.filter(item => {
        // Search filter dengan fuzzy search
        if (currentFilters.search && currentFilters.search.trim() !== '') {
            const searchTerm = currentFilters.search.trim();
            const nameMatch = fuzzySearch(searchTerm, item.name);
            const originalMatch = fuzzySearch(searchTerm, item.original || '');
            
            if (!nameMatch && !originalMatch) {
                return false;
            }
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

// Update search suggestion
function updateSearchSuggestion() {
    const searchInput = document.getElementById('searchInput');
    let suggestionBox = document.getElementById('searchSuggestion');
    
    // Buat suggestion box jika belum ada
    if (!suggestionBox && searchInput) {
        suggestionBox = document.createElement('div');
        suggestionBox.id = 'searchSuggestion';
        suggestionBox.className = 'search-suggestion';
        searchInput.parentNode.appendChild(suggestionBox);
    }
    
    if (!suggestionBox) return;
    
    const searchTerm = currentFilters.search;
    
    if (!searchTerm || searchTerm.length < 2) {
        suggestionBox.style.display = 'none';
        return;
    }
    
    // Cari username yang mirip dengan pencarian
    const suggestions = usernames
        .filter(item => fuzzySearch(searchTerm, item.name))
        .map(item => item.name)
        .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
        .slice(0, 5); // Maksimal 5 saran
    
    if (suggestions.length === 0) {
        suggestionBox.style.display = 'none';
        return;
    }
    
    // Tampilkan saran
    suggestionBox.innerHTML = suggestions.map(s => `
        <div class="suggestion-item" onclick="selectSuggestion('${s.replace(/'/g, "\\'")}')">
            @${s}
        </div>
    `).join('');
    
    suggestionBox.style.display = 'block';
}

// Select suggestion
window.selectSuggestion = (suggestion) => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = suggestion;
    }
    currentFilters.search = suggestion;
    applyFilters();
    
    const suggestionBox = document.getElementById('searchSuggestion');
    if (suggestionBox) {
        suggestionBox.style.display = 'none';
    }
};

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
    
    if (!grid) return;
    
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
    
    if (totalCount) totalCount.textContent = usernames.length;
    if (availableCount) availableCount.textContent = usernames.filter(u => u.status === 'available').length;
    if (soldCount) soldCount.textContent = usernames.filter(u => u.status === 'sold').length;
    
    const prices = usernames.map(u => u.price);
    if (minPriceStat) minPriceStat.textContent = `$${Math.min(...prices)}`;
    if (maxPriceStat) maxPriceStat.textContent = `$${Math.max(...prices)}`;
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

// Toggle filter panel
function toggleFilterPanel() {
    const panel = document.getElementById('filterPanel');
    const overlay = document.getElementById('filterOverlay');
    
    if (panel && overlay) {
        panel.classList.toggle('show');
        overlay.classList.toggle('show');
        
        // Prevent body scroll when panel is open
        if (panel.classList.contains('show')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
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
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    
    if (minPriceInput) minPriceInput.value = currentFilters.minPrice;
    if (maxPriceInput) maxPriceInput.value = currentFilters.maxPrice;
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
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    updateFilterUI();
    applyFilters();
    toggleFilterPanel();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    initTelegramUser();
    loadData();
    
    // Filter toggle
    const filterToggle = document.getElementById('filterToggle');
    const closeFilter = document.getElementById('closeFilter');
    const filterOverlay = document.getElementById('filterOverlay');
    
    if (filterToggle) filterToggle.addEventListener('click', toggleFilterPanel);
    if (closeFilter) closeFilter.addEventListener('click', toggleFilterPanel);
    if (filterOverlay) filterOverlay.addEventListener('click', toggleFilterPanel);
    
    // Search input with debounce untuk real-time search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentFilters.search = e.target.value;
                applyFilters();
                updateSearchSuggestion();
            }, 300); // Debounce 300ms
        });
        
        // Search on enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                currentFilters.search = e.target.value;
                applyFilters();
                const suggestionBox = document.getElementById('searchSuggestion');
                if (suggestionBox) suggestionBox.style.display = 'none';
            }
        });
    }
    
    // Search button
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                currentFilters.search = searchInput.value;
                applyFilters();
                const suggestionBox = document.getElementById('searchSuggestion');
                if (suggestionBox) suggestionBox.style.display = 'none';
            }
        });
    }
    
    // Click outside to close suggestion
    document.addEventListener('click', (e) => {
        const searchInput = document.getElementById('searchInput');
        const suggestionBox = document.getElementById('searchSuggestion');
        if (suggestionBox && searchInput && 
            !searchInput.contains(e.target) && 
            !suggestionBox.contains(e.target)) {
            suggestionBox.style.display = 'none';
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
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            const minPrice = document.getElementById('minPrice');
            const maxPrice = document.getElementById('maxPrice');
            
            currentFilters.minPrice = parseInt(minPrice?.value) || 0;
            currentFilters.maxPrice = parseInt(maxPrice?.value) || 1000;
            applyFilters();
            toggleFilterPanel();
        });
    }
    
    // Reset filters button
    const resetFiltersBtn = document.getElementById('resetFilters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
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
    getUsernames: () => usernames,
    testSearch: (query) => {
        return usernames.filter(u => fuzzySearch(query, u.name)).map(u => u.name);
    }
};
