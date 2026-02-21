/**
 * menu.js — Menu page functionality
 * - Fetches menu from GET /api/menu
 * - Renders filterable menu cards
 * - Handles add-to-cart with visual feedback
 */

// ─── State ───────────────────────────────────────────────────
let allItems    = [];        // all menu items from API
let activeFilter = 'all';    // current category filter

// ─── DOM References ───────────────────────────────────────────
const menuGrid   = document.getElementById('menu-grid');
const filterBar  = document.getElementById('filter-bar');
const loadingEl  = document.getElementById('menu-loading');

// ─── Emoji Map ────────────────────────────────────────────────
// Fallback emojis by category (API may or may not supply them)
const CATEGORY_EMOJI = {
  starters:   '🥗',
  appetizers: '🥗',
  mains:      '🍽️',
  entrees:    '🍽️',
  pasta:      '🍝',
  seafood:    '🦞',
  meat:       '🥩',
  vegetarian: '🥦',
  desserts:   '🍮',
  drinks:     '🍷',
  beverages:  '🥂',
  sides:      '🫙',
};

/**
 * Resolve an emoji for a menu item
 * @param {Object} item
 * @returns {string}
 */
function resolveEmoji(item) {
  if (item.emoji) return item.emoji;
  const cat = (item.category || '').toLowerCase();
  return CATEGORY_EMOJI[cat] || '🍽️';
}

// ─── Render ───────────────────────────────────────────────────

/**
 * Build the filter bar buttons from unique categories
 * @param {Array} items
 */
function renderFilterBar(items) {
  const categories = ['all', ...new Set(items.map(i => i.category).filter(Boolean))];

  filterBar.innerHTML = categories.map(cat => `
    <button
      class="filter-btn ${cat === 'all' ? 'active' : ''}"
      data-category="${cat}"
    >
      ${cat === 'all' ? 'All Items' : capitalise(cat)}
    </button>
  `).join('');

  // Attach click listeners
  filterBar.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.category;
      filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMenuGrid();
    });
  });
}

/**
 * Render the menu grid with optional category filter
 */
function renderMenuGrid() {
  // Only show available items
  const filtered = allItems.filter(i => i.available === true);
  const items = activeFilter === 'all'
    ? filtered
    : filtered.filter(i => i.category === activeFilter);

  if (!items.length) {
    menuGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🍽️</div>
        <h3>Nothing here yet</h3>
        <p>No items in this category.</p>
      </div>`;
    return;
  }

  menuGrid.innerHTML = items.map(item => buildMenuCard(item)).join('');

  // Attach add-to-cart listeners after render
  menuGrid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = btn.dataset.id;
      const item = allItems.find(i => String(i.id) === String(id));
      if (!item) return;

      addToCart({ ...item, emoji: resolveEmoji(item) });

      // Visual feedback on button
      btn.classList.add('added');
      btn.innerHTML = `
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="2 8 6 12 14 4"/>
        </svg>
        Added`;

      setTimeout(() => {
        btn.classList.remove('added');
        btn.innerHTML = `
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="6.5" cy="13.5" r="1"/>
            <circle cx="12.5" cy="13.5" r="1"/>
            <polyline points="1 1 3 1 4.5 10 14 10"/>
            <line x1="4.8" y1="7" x2="13.8" y2="7"/>
          </svg>
          Add to Cart`;
      }, 1600);
    });
  });
}

/**
 * Build HTML string for a single menu card
 * @param {Object} item
 * @returns {string}
 */
function buildMenuCard(item) {
  const emoji = resolveEmoji(item);
  const price = formatCurrency(item.price);

  // Optional badges
  let badge = '';
  if (item.popular || item.featured)    badge = `<span class="menu-card-badge badge-popular">Popular</span>`;
  else if (item.new || item.isNew)       badge = `<span class="menu-card-badge badge-new">New</span>`;
  else if (item.spicy || item.hot)       badge = `<span class="menu-card-badge badge-spicy">🌶 Spicy</span>`;

  return `
    <article class="menu-card" data-id="${item.id}">
      <div class="menu-card-image">
        ${badge}
        ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" style="width:220px;height:220px;object-fit:cover;border-radius:18px;box-shadow:0 2px 16px #0002;margin-bottom:12px;" />` : `<span style="position:relative;z-index:1">${emoji}</span>`}
      </div>
      <div class="menu-card-body">
        <span class="menu-card-category">${item.category || 'Special'}</span>
        <h3 class="menu-card-name">${escapeHtml(item.name)}</h3>
        <p class="menu-card-desc">${escapeHtml(item.description || item.desc || 'A carefully crafted dish using the finest seasonal ingredients.')}</p>
        <div class="menu-card-footer">
          <span class="menu-card-price">${price}</span>
          <button
            class="add-to-cart-btn"
            data-id="${item.id}"
            aria-label="Add ${escapeHtml(item.name)} to cart"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="6.5" cy="13.5" r="1"/>
              <circle cx="12.5" cy="13.5" r="1"/>
              <polyline points="1 1 3 1 4.5 10 14 10"/>
              <line x1="4.8" y1="7" x2="13.8" y2="7"/>
            </svg>
            Add to Cart
          </button>
        </div>
      </div>
    </article>`;
}

// ─── Data Loading ─────────────────────────────────────────────

/**
 * Load menu from API and initialise the page
 */
async function loadMenu() {
  // Show loading state
  menuGrid.innerHTML = '';
  loadingEl.style.display = 'flex';

  try {
    allItems = await fetchMenu();

    loadingEl.style.display = 'none';
    renderFilterBar(allItems);
    renderMenuGrid();

  } catch (err) {
    loadingEl.style.display = 'none';
      // Menu load error

    // Show error / fallback demo data
    menuGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">⚠️</div>
        <h3>Could not load menu</h3>
        <p>The server may be offline. Showing sample items instead.</p>
      </div>`;

    // Load demo data as fallback
    allItems = getDemoMenu();
    renderFilterBar(allItems);
    renderMenuGrid();
  }
}

/**
 * Demo menu data used when the API is unreachable
 * @returns {Array}
 */
function getDemoMenu() {
  return [
    { id: 1,  name: 'Burrata & Heirloom Tomato',  category: 'Starters',  price: 16.00, emoji: '🥗',  description: 'Fresh burrata, heirloom tomatoes, aged balsamic, fresh basil and extra-virgin olive oil.',   popular: true  },
    { id: 2,  name: 'Seared Foie Gras',           category: 'Starters',  price: 28.00, emoji: '🍳',  description: 'Pan-seared foie gras on brioche toast, fig compote and micro herbs.', new: true },
    { id: 3,  name: 'Truffle Arancini',            category: 'Starters',  price: 14.00, emoji: '🧆',  description: 'Crispy risotto balls filled with black truffle and taleggio, served with romesco sauce.' },
    { id: 4,  name: 'Pan-Roasted Halibut',         category: 'Mains',     price: 42.00, emoji: '🐟',  description: 'Wild-caught halibut, cauliflower purée, brown butter capers and crispy capers.', featured: true },
    { id: 5,  name: 'Dry-Aged Ribeye',             category: 'Mains',     price: 68.00, emoji: '🥩',  description: '45-day dry-aged ribeye, roasted bone marrow, bearnaise sauce and pommes frites.' },
    { id: 6,  name: 'Wild Mushroom Risotto',       category: 'Mains',     price: 32.00, emoji: '🍚',  description: 'Carnaroli rice, porcini, chanterelles, truffle oil and aged Parmigiano Reggiano.' },
    { id: 7,  name: 'Duck Confit',                 category: 'Mains',     price: 38.00, emoji: '🦆',  description: 'Slow-cooked duck leg, cherry jus, confit garlic purée and wilted endive.' },
    { id: 8,  name: 'Spiced Lamb Ragù Pappardelle', category: 'Pasta',   price: 30.00, emoji: '🍝',  description: 'House-made pappardelle, braised lamb shoulder, harissa and preserved lemon.', spicy: true },
    { id: 9,  name: 'Black Truffle Tagliolini',    category: 'Pasta',     price: 36.00, emoji: '🍝',  description: 'Fresh egg pasta, Périgord black truffle, cultured butter and Parmigiano.' },
    { id: 10, name: 'Valrhona Chocolate Fondant',  category: 'Desserts',  price: 14.00, emoji: '🍫',  description: 'Warm Valrhona 70% fondant, Madagascan vanilla ice cream and cocoa nib tuile.' },
    { id: 11, name: 'Crème Brûlée',               category: 'Desserts',  price: 12.00, emoji: '🍮',  description: 'Classic vanilla custard with a perfectly torched sugar crust.' },
    { id: 12, name: 'Sommelier Wine Selection',    category: 'Drinks',    price: 18.00, emoji: '🍷',  description: 'Curated glass pour matched to your meal by our in-house sommelier.' },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadMenu);
