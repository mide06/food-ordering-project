/**
 * orders.js — Orders page functionality
 * - Fetches user's order history from localStorage and API
 * - Renders expandable order cards with receipt and reorder options
 * - Handles authentication check for logged-in users
 * - Polling for live order updates (optional)
 */

// ─── DOM References ───────────────────────────────────────────
const ordersList    = document.getElementById('orders-list');
const ordersLoading = document.getElementById('orders-loading');
const ordersEmpty   = document.getElementById('orders-empty');
const ordersError   = document.getElementById('orders-error');
const notLoggedIn   = document.getElementById('not-logged-in');
const refreshBtn    = document.getElementById('refresh-orders-btn');
const orderCountEl  = document.getElementById('order-count');
const errorMessage  = document.getElementById('error-message');

// ─── State ────────────────────────────────────────────────────
let ordersData      = [];
let isLoading       = false;

// ─── Authentication Helpers ───────────────────────────────────

/**
 * Check if user is logged in
 * @returns {boolean} True if logged in
 */
function isLoggedIn() {
  const token = localStorage.getItem('maison_token');
  return !!token;
}

/**
 * Get current user information
 * @returns {Object|null} User object or null if not logged in
 */
function getCurrentUser() {
  try {
    const userData = localStorage.getItem('maison_user');
    return userData ? JSON.parse(userData) : null;
  } catch {
    return null;
  }
}

/**
 * Get order history from localStorage
 * @returns {string[]} Array of order IDs
 */
function getOrderHistoryIds() {
  try {
    return JSON.parse(localStorage.getItem('order_history') || '[]');
  } catch {
    return [];
  }
}

// ─── Load Orders ──────────────────────────────────────────────

/**
 * Load order details from API
 * @param {string} orderId - Order ID to load
 * @returns {Promise<Object|null>} Order object or null if failed
 */
async function loadOrderDetails(orderId) {
  try {
    console.log(`Loading order details for order ID: ${orderId}`);
      // Loading order details for order ID
    const response = await fetch(`/api/orders/${orderId}`);
    
    if (!response.ok) {
      console.warn(`Failed to load order ${orderId}: ${response.statusText}`);
        // Failed to load order
      return null;
    }

    const data = await response.json();
    return data.order;
  } catch (error) {
    console.warn(`Error loading order ${orderId}:`, error);
      // Error loading order
    return null;
  }
}

/**
 * Fetch orders from localStorage history and API
 * @param {boolean} silent - if true, don't show full loading spinner
 */
async function loadOrders(silent = false) {
  if (isLoading) return;
  isLoading = true;

  if (!silent) {
    ordersList.innerHTML = '';
    ordersLoading.style.display = 'flex';
    ordersEmpty.style.display = 'none';
    ordersError.style.display = 'none';
    notLoggedIn.style.display = 'none';
  }
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Refreshing…`;
  }

  // Early return if not logged in
  if (!isLoggedIn()) {
    ordersLoading.style.display = 'none';
    notLoggedIn.style.display = 'flex';
    isLoading = false;
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = '↻ Refresh';
    }
    return;
  }

  // Get order IDs from localStorage
  const orderIds = getOrderHistoryIds();
  if (orderIds.length === 0) {
    ordersLoading.style.display = 'none';
    ordersEmpty.style.display = 'flex';
    ordersList.innerHTML = '';
    if (orderCountEl) orderCountEl.textContent = '0';
    isLoading = false;
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = '↻ Refresh';
    }
    return;
  }

  try {
    const orderPromises = orderIds.map(orderId => loadOrderDetails(orderId));
    const orders = await Promise.all(orderPromises);
    const validOrders = orders.filter(order => order !== null);
    ordersLoading.style.display = 'none';
    if (validOrders.length === 0) {
      ordersEmpty.style.display = 'flex';
      ordersList.innerHTML = '';
    } else {
      ordersEmpty.style.display = 'none';
      ordersData = validOrders;
      renderOrders(validOrders);
    }
    if (orderCountEl) orderCountEl.textContent = validOrders.length;
  } catch (err) {
    ordersLoading.style.display = 'none';
    ordersError.style.display = 'flex';
    if (errorMessage) errorMessage.textContent = err.message || 'Unable to load order history. Please try again.';
  }
  isLoading = false;
  if (refreshBtn) {
    refreshBtn.disabled = false;
    refreshBtn.textContent = '↻ Refresh';
  }
}

// ─── Render ───────────────────────────────────────────────────

/**
 * Render all orders to the list
 * @param {Array} orders
 */
function renderOrders(orders) {
  // Sort newest first
  const sorted = [...orders].sort((a, b) => {
    const da = new Date(a.createdAt || 0);
    const db = new Date(b.createdAt || 0);
    return db - da;
  });

  ordersList.innerHTML = sorted.map(order => buildOrderCard(order)).join('');
  attachOrderCardListeners();
}

/**
 * Build HTML for a single order card
 * @param {Object} order
 * @returns {string}
 */
function buildOrderCard(order) {
  const status = (order.status || 'pending').toLowerCase().replace(/\s+/g, '-');
  const statusLabel = capitalise(order.status || 'Pending');
  const orderId = order.id || order.order_id || '—';
  const orderNumber = order.orderNumber || `ORD-${orderId}`;
  const dateStr = formatDate(order.createdAt);
  const items = order.OrderItems || [];
  const total = order.totalAmount || 0;
  const customerName = getCurrentUser()?.name || getCurrentUser()?.email?.split('@')[0] || 'Guest Customer';
  const deliveryAddress = order.deliveryAddress || 'Not specified';

  return `
    <article class="order-card" data-order-id="${orderId}">
      <!-- Card Header (click to expand) -->
      <div class="order-card-header">
        <div class="order-meta">
          <span class="order-id">Order #${shortId(orderNumber)}</span>
          <span class="order-time">${dateStr}</span>
        </div>
        <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
          <span class="order-status-badge status-${status}">${statusLabel}</span>
          <span class="order-total-summary">${formatCurrency(total)}</span>
          <span class="order-expand-icon">▾</span>
        </div>
      </div>

      <!-- Card Body (hidden until expanded) -->
      <div class="order-card-body">
        <div class="order-info-section">
          <div class="order-customer-info">
            <strong>Customer:</strong> ${escapeHtml(customerName)}<br>
            <strong>Delivery Address:</strong> ${escapeHtml(deliveryAddress)}
          </div>
        </div>

        <div class="order-items-list">
          <h4 style="margin-bottom: 12px; color: var(--stone);">Order Items:</h4>
          ${items.map(item => buildOrderItemRow(item)).join('')}
        </div>

        <div class="order-card-footer">
          <div class="order-actions">
            <button class="btn btn-outline" onclick="window.open('/receipt.html?orderId=${orderId}', '_blank')">📄 View Receipt</button>
            <button class="btn btn-accent" onclick="reorderItems('${orderId}')">🔄 Reorder</button>
            <button class="btn btn-outline" onclick="printReceipt('${orderId}')">🖨️ Print</button>
          </div>
          <div class="order-grand-total">
            <span class="label">Total Charged</span>
            <span class="amount">${formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </article>`;
}

/**
 * Build a single order item row
 * @param {Object} item
 * @returns {string}
 */
function buildOrderItemRow(item) {
  const menuItem = item.MenuItem || {};
  const name = menuItem.name || 'Unknown item';
  const qty = item.quantity || 1;
  const unitPrice = item.unitPrice || 0;
  const itemTotal = unitPrice * qty;

  return `
    <div class="order-item-row">
      <span class="order-item-emoji">🍽️</span>
      <span class="order-item-name">${escapeHtml(name)}</span>
      <span class="order-item-qty">×${qty}</span>
      <span class="order-item-price">${formatCurrency(itemTotal)}</span>
    </div>`;
}

// ─── Order Actions ────────────────────────────────────────────

/**
 * Reorder items from a previous order
 * @param {string} orderId - Order ID to reorder from
 */
async function reorderItems(orderId) {
  try {
    // Load order details
    const order = await loadOrderDetails(orderId);
    if (!order || !order.OrderItems) {
      alert('Unable to load order items for reorder');
      return;
    }

    // Add items to cart
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    for (const orderItem of order.OrderItems) {
      const menuItem = orderItem.MenuItem;
      if (!menuItem) continue;

      // Check if item already in cart
      const existingIndex = cart.findIndex(item => item.id === menuItem.id);
      
      if (existingIndex >= 0) {
        // Increase quantity
        cart[existingIndex].quantity += orderItem.quantity;
      } else {
        // Add new item
        cart.push({
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: orderItem.quantity,
          image: menuItem.image || '/api/placeholder/300/200'
        });
      }
    }

    // Save updated cart
    localStorage.setItem('cart', JSON.stringify(cart));

    // Update cart badge if function exists
    if (typeof updateCartBadge === 'function') {
      updateCartBadge();
    }

    // Show success message and redirect
    alert(`${order.OrderItems.length} items added to cart!`);
    window.location.href = '/cart.html';

  } catch (error) {
    console.error('Error reordering items:', error);
    alert('Failed to reorder items. Please try again.');
  }
}

/**
 * Print receipt for an order
 * @param {string} orderId - Order ID to print receipt for
 */
function printReceipt(orderId) {
  window.open(`/receipt.html?orderId=${orderId}`, '_blank', 'width=800,height=600');
}

// ─── Expand / Collapse ────────────────────────────────────────

/**
 * Attach click listeners to order card headers for expand/collapse
 */
function attachOrderCardListeners() {
  ordersList.querySelectorAll('.order-card-header').forEach(header => {
    header.addEventListener('click', () => {
      const card = header.closest('.order-card');
      card.classList.toggle('expanded');
    });
  });
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Shorten a long order ID for display
 * e.g. "ORD-20241201-001" → "20241201-001"
 *      "123e4567-e89b-…" → "123E45…"
 */
function shortId(id) {
  if (!id || id === '—') return id;
  const str = String(id);
  // Strip "ORD-" prefix
  if (str.startsWith('ORD-')) return str.slice(4);
  // Truncate UUID-style IDs
  if (str.length > 12) return str.slice(0, 8).toUpperCase() + '…';
  return str;
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadOrders();

  // Refresh button
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadOrders(false));
  }
});

// ─── Expose functions for onclick handlers ────────────────────
window.reorderItems = reorderItems;
window.printReceipt = printReceipt;
