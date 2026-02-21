/**
 * utils.js — Shared utilities for FUL RESTAURANT app
 * Handles: cart state, toast notifications, API calls, nav badge
 */

// ─── Configuration ───────────────────────────────────────────
const API_BASE = 'http://localhost:3000/api';

// ─── Cart Management (localStorage) ─────────────────────────

/**
 * Get the current cart from localStorage
 * @returns {Array} array of cart items [{id, name, price, quantity, emoji, category}]
 */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem('maison_cart') || '[]');
  } catch {
    return [];
  }
}

/**
 * Persist cart to localStorage
 * @param {Array} cart
 */
function saveCart(cart) {
  localStorage.setItem('maison_cart', JSON.stringify(cart));
  updateCartBadge();
}

/**
 * Add an item to the cart (or increment quantity if already present)
 * @param {Object} item - menu item object
 */
function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(c => c.id === item.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id:       item.id,
      name:     item.name,
      price:    item.price,
      quantity: 1,
      emoji:    item.emoji || '🍽️',
      category: item.category || '',
    });
  }

  saveCart(cart);
  showToast(`${item.name} added to cart`, 'success');
}

/**
 * Update the quantity of a specific cart item
 * @param {string|number} id  - item ID
 * @param {number}        qty - new quantity (removes if <= 0)
 */
function updateCartQty(id, qty) {
  let cart = getCart();
  if (qty <= 0) {
    cart = cart.filter(c => c.id !== id);
  } else {
    const item = cart.find(c => c.id === id);
    if (item) item.quantity = qty;
  }
  saveCart(cart);
}

/**
 * Remove an item from the cart entirely
 * @param {string|number} id
 */
function removeFromCart(id) {
  const cart = getCart().filter(c => c.id !== id);
  saveCart(cart);
}

/**
 * Clear the entire cart
 */
function clearCart() {
  localStorage.removeItem('maison_cart');
  updateCartBadge();
}

/**
 * Get total item count (sum of quantities)
 * @returns {number}
 */
function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Get subtotal
 * @returns {number}
 */
function getCartSubtotal() {
  return getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// ─── Cart Badge Update ────────────────────────────────────────

/**
 * Update all cart badge elements in the navigation
 */
function updateCartBadge() {
  const count = getCartCount();
  const badges = document.querySelectorAll('.cart-badge');

  badges.forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
    // Pop animation
    badge.classList.remove('pop');
    void badge.offsetWidth; // reflow
    if (count > 0) badge.classList.add('pop');
  });
}

// ─── Toast Notifications ──────────────────────────────────────

/**
 * Show a toast notification
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration ms
 */
function showToast(message, type = 'info', duration = 3000) {
  // Ensure container exists
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✓', error: '✕', info: '·' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || '·'}</span><span>${message}</span>`;

  container.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ─── API Helpers ─────────────────────────────────────────────

/**
 * Fetch menu items from the API
 * @returns {Promise<Array>}
 */
async function fetchMenu() {
  const res = await fetch(`${API_BASE}/menu`);
  if (!res.ok) throw new Error(`Failed to fetch menu: ${res.status}`);
  return res.json();
}

/**
 * Place an order via POST /orders
 * @param {Object} orderData - { customer, items, total, notes }
 * @returns {Promise<Object>}
 */
async function placeOrder(orderData) {
  const token = localStorage.getItem('maison_token');
  const headers = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(orderData),
  });
  if (!res.ok) {
    let msg = `Failed to place order: ${res.status}`;
    try {
      const err = await res.json();
      msg = err.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

/**
 * Fetch all orders from the API
 * @returns {Promise<Array>}
 */
async function fetchOrders() {
  const res = await fetch(`${API_BASE}/orders`);
  if (!res.ok) throw new Error(`Failed to fetch orders: ${res.status}`);
  return res.json();
}

// ─── Utility Helpers ─────────────────────────────────────────

/**
 * Format a number as currency
 * @param {number} amount
 * @returns {string} e.g. "₦12.50"
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format an ISO date string to a readable format
 * @param {string} isoString
 * @returns {string}
 */
function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Highlight the active nav link based on current page filename
 */
function setActiveNavLink() {
  const path = window.location.pathname;
  const filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === filename || (filename === 'index.html' && href === './') || href === `./${filename}`) {
      link.classList.add('active');
    }
  });
}

/**
 * Initialize mobile nav toggle
 */
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links  = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
    const bars = toggle.querySelectorAll('span');
    if (links.classList.contains('open')) {
      bars[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      bars[1].style.opacity = '0';
      bars[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      bars.forEach(b => { b.style.transform = ''; b.style.opacity = ''; });
    }
  });

  // Close when a link is clicked
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.querySelectorAll('span').forEach(b => { b.style.transform = ''; b.style.opacity = ''; });
    });
  });
}

// ─── User Authentication Utilities ─────────────────────────────

/**
 * Check if user is logged in
 * @returns {boolean}
 */
function isLoggedIn() {
  const token = localStorage.getItem('maison_token');
  return !!token;
}

/**
 * Get current user data
 * @returns {Object|null}
 */
function getUser() {
  try {
    const userData = localStorage.getItem('maison_user');
    return userData ? JSON.parse(userData) : null;
  } catch {
    return null;
  }
}

/**
 * Logout user and redirect to login
 */
function logout() {
  localStorage.removeItem('maison_token');
  localStorage.removeItem('maison_user');
  localStorage.removeItem('token'); // Legacy cleanup
  localStorage.removeItem('user'); // Legacy cleanup
  window.location.href = '/login files/login.html';
}

/**
 * Display user navigation info - shows login status and user name if logged in
 * Should be called on each page to update the navigation
 */
function showUserNav() {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;

  let userLi = document.getElementById('user-nav');
  if (!userLi) {
    userLi = document.createElement('li');
    userLi.id = 'user-nav';
    navLinks.appendChild(userLi);
  }
  
  const user = getUser();
  const loggedIn = isLoggedIn();
  
  if (loggedIn && user) {
    userLi.innerHTML = `
      <div class="user-info">
        <span class="user-welcome">Welcome, <strong>${user.name || user.email.split('@')[0]}</strong></span>
        <button id="logout-btn" class="btn btn-outline btn-sm">Logout</button>
      </div>
    `;
    
    // Attach logout event listener
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = logout;
    
    // Add logged-in class to body for styling
    document.body.classList.add('user-logged-in');
  } else {
    userLi.innerHTML = `
      <div class="auth-buttons">
        <a href="/login files/login.html" class="btn btn-primary btn-sm">Login</a>
        <a href="/login files/signup.html" class="btn btn-outline btn-sm">Sign Up</a>
      </div>
    `;
    
    // Remove logged-in class
    document.body.classList.remove('user-logged-in');
  }
}

// ─── Init on DOM ready ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setActiveNavLink();
  updateCartBadge();
  initMobileNav();
  showUserNav(); // Add user authentication display to all pages
});
