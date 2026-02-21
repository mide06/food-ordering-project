/**
 * admin-utils.js
 * Shared utilities for the admin panel:
 * - API base URL & fetch wrappers
 * - Toast notification system
 * - Active nav link highlighting
 * - Mobile sidebar toggle
 * - Shared formatters
 */

// ─── API Configuration ────────────────────────────────────────
const API_BASE = 'http://localhost:3000/api';

/**
 * Centralized fetch wrapper with error handling.
 * All API calls go through here so errors are handled consistently.
 *
 * @param {string} endpoint  - e.g. '/menu' or '/orders/5/status'
 * @param {object} options   - standard fetch options (method, body, etc.)
 * @returns {Promise<any>}   - parsed JSON response
 * @throws {Error}           - with a user-readable message
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  // Always send JSON body as a string with correct Content-Type
  if (options.body && typeof options.body === 'object') {
    options.body = JSON.stringify(options.body);
    options.headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch (networkErr) {
    throw new Error(`Network error — is the server running? (${networkErr.message})`);
  }

  if (!response.ok) {
    // Try to extract a message from the response body
    let msg = `Server responded with ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody.message || errBody.error) msg = errBody.message || errBody.error;
    } catch { /* ignore parse errors */ }
    throw new Error(msg);
  }

  // 204 No Content — nothing to parse
  if (response.status === 204) return null;

  return response.json();
}

// ─── Convenience API helpers ──────────────────────────────────

/** GET /api/menu */
const getMenu = () => apiFetch('/menu');

/** POST /api/menu — add new item (supports FormData for image upload) */
const createMenuItem = (data) => {
  // If FormData, use fetch directly to avoid JSON conversion
  if (data instanceof FormData) {
    return fetch(`${API_BASE}/menu`, {
      method: 'POST',
      body: data
    }).then(res => {
      if (!res.ok) throw new Error('Failed to add menu item');
      return res.json();
    });
  }
  // Otherwise, use apiFetch for JSON
  return apiFetch('/menu', { method: 'POST', body: data });
};

/** PATCH /api/menu/:id — edit item fields */
const updateMenuItem = (id, data) => apiFetch(`/menu/${id}`, { method: 'PATCH', body: data });

/** DELETE /api/menu/:id */
const deleteMenuItem = (id) => apiFetch(`/menu/${id}`, { method: 'DELETE' });

/** PATCH /api/menu/:id/availability — toggle available flag */
const toggleMenuItemAvailability = (id, available) =>
  apiFetch(`/menu/${id}/availability`, { method: 'PATCH', body: { available } });

/** GET /api/orders */
const getOrders = () => apiFetch('/orders');

/** PATCH /api/orders/:id/status — update order status */
const updateOrderStatus = (id, status) =>
  apiFetch(`/orders/${id}/status`, { method: 'PATCH', body: { status } });

// ─── Admin Dashboard APIs ──────────────────────────────────────

/** GET /api/admin/dashboard — get dashboard statistics */
const getDashboardStats = () => apiFetch('/admin/dashboard');

/** GET /api/admin/orders — get orders with admin details */
const getAdminOrders = () => apiFetch('/admin/orders');

/** PATCH /api/admin/orders/:id/status — update order status (admin) */
const updateAdminOrderStatus = (id, status) => 
  apiFetch(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } });

/** GET /api/admin/payments — get all payments */
const getAdminPayments = () => apiFetch('/admin/payments');

/** GET /api/admin/revenue — get revenue summary */
const getRevenueSummary = () => apiFetch('/admin/revenue');

// ─── Toast Notifications ──────────────────────────────────────

/**
 * Show a toast message at the bottom-right of the screen.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration  milliseconds before auto-remove
 */
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${ICONS[type] || 'ℹ'}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), duration);
}

// ─── Sidebar / Nav Helpers ────────────────────────────────────

/**
 * Mark the currently active sidebar link based on the current filename.
 */
function setActiveSidebarLink() {
  const path = window.location.pathname;
  const file = path.substring(path.lastIndexOf('/') + 1) || 'dashboard.html';

  document.querySelectorAll('.sidebar-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href === file || href === `./${file}`) {
      link.classList.add('active');
    }
  });
}

/**
 * Wire up mobile sidebar toggle button.
 */
function initMobileSidebar() {
  const toggle  = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // Close on backdrop click
  document.addEventListener('click', e => {
    if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

// ─── Formatters ───────────────────────────────────────────────

/**
 * Format number as Nigerian Naira currency.
 * @param {number} n
 * @returns {string}
 */
function fmt$(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN',
  }).format(n);
}

/**
 * Format ISO date string to readable admin format.
 * @param {string} iso
 * @returns {string}
 */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Shorten a long ID for display.
 * @param {string|number} id
 * @returns {string}
 */
function shortId(id) {
  const s = String(id);
  if (s.length > 10) return '#' + s.slice(0, 8).toUpperCase();
  return '#' + s;
}

/**
 * Return a status badge HTML string.
 * @param {string} status
 * @returns {string}
 */
function statusBadge(status) {
  const s = (status || 'pending').toLowerCase().replace(/\s/g, '-');
  return `<span class="badge badge-${s}">
    <span class="badge-dot"></span>${s}
  </span>`;
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {*} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setActiveSidebarLink();
  initMobileSidebar();
});
