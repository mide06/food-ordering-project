/**
 * dashboard.js
 * Admin Dashboard page logic.
 *
 * API calls:
 *   GET /api/admin/dashboard → dashboard statistics
 *   GET /api/menu           → menu items for category breakdown
 *   GET /api/admin/orders   → recent orders with details
 */

// ─── DOM refs ──────────────────────────────────────────────────
const elTotalMenuItems  = document.getElementById('stat-menu-items');
const elTotalOrders     = document.getElementById('stat-total-orders');
const elPendingOrders   = document.getElementById('stat-pending-orders');
const elTotalRevenue    = document.getElementById('stat-total-revenue');
const elRecentOrdersTbl = document.getElementById('recent-orders-tbody');
const elCategoryBreakdown = document.getElementById('category-breakdown-tbody');
const elLastUpdated     = document.getElementById('last-updated');

// ─── Auto-refresh state ────────────────────────────────────────
let refreshInterval;
const REFRESH_RATE = 30000; // 30 seconds

// ─── Load Dashboard Data ──────────────────────────────────────

/**
 * Fetches dashboard stats, menu, and orders data in parallel,
 * then populates all summary cards and tables.
 */
async function loadDashboard() {
  setLoadingState();

  try {
    // Fire all requests simultaneously for speed
    const [dashboardStats, menuItems, orders] = await Promise.all([
      getDashboardStats(),
      getMenu(),
      getAdminOrders(),
    ]);

    populateSummaryCards(dashboardStats, menuItems, orders);
    populateRecentOrders(orders);
    populateCategoryBreakdown(menuItems);

    if (elLastUpdated) {
      elLastUpdated.textContent = 'Updated ' + new Date().toLocaleTimeString();
    }

  } catch (err) {
    console.error('[Dashboard] Load error:', err);
      // Dashboard Load error
    showToast(err.message, 'error');
    setErrorState(err.message);
  }
}

/**
 * Start auto-refresh for real-time dashboard updates
 */
function startAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  
  refreshInterval = setInterval(async () => {
    try {
      await loadDashboard();
    } catch (err) {
      console.error('[Dashboard] Auto-refresh error:', err);
        // Dashboard Auto-refresh error
    }
  }, REFRESH_RATE);
}

/**
 * Stop auto-refresh
 */
function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// ─── Summary Cards ────────────────────────────────────────────

/**
 * Populates the four summary stat cards using dashboard stats API.
 * @param {Object} stats     - dashboard stats from GET /api/admin/dashboard
 * @param {Array} menuItems  - array of menu item objects from GET /api/menu
 * @param {Array} orders     - array of order objects from GET /api/admin/orders
 */
function populateSummaryCards(stats, menuItems, orders) {
  // Total menu items
  if (elTotalMenuItems) {
    elTotalMenuItems.textContent = menuItems.length;
  }

  // Total orders (from dashboard stats API)
  if (elTotalOrders) {
    elTotalOrders.textContent = stats.totalOrders || 0;
  }

  // Pending orders — orders where status === 'pending'
  const pendingCount = orders.filter(
    o => (o.status || '').toLowerCase() === 'pending'
  ).length;

  if (elPendingOrders) {
    elPendingOrders.textContent = pendingCount;
    // Highlight pending card if > 0
    const pendingCard = elPendingOrders.closest('.summary-card');
    if (pendingCard && pendingCount > 0) {
      pendingCard.style.setProperty('--card-accent', '#d97706');
    } else if (pendingCard) {
      pendingCard.style.removeProperty('--card-accent');
    }
  }

  // Total revenue (from dashboard stats API)
  if (elTotalRevenue) {
    elTotalRevenue.textContent = fmt$(stats.totalRevenue || 0);
  }
}

// ─── Recent Orders Table ──────────────────────────────────────

/**
 * Renders the 10 most recent orders in the dashboard table.
 * Orders are sorted newest-first by created_at.
 * @param {Array} orders
 */
function populateRecentOrders(orders) {
  if (!elRecentOrdersTbl) return;

  if (!orders.length) {
    elRecentOrdersTbl.innerHTML = `
      <tr>
        <td colspan="5" class="table-state">
          <div class="state-icon">📋</div>
          No orders yet.
        </td>
      </tr>`;
    return;
  }

  // Sort newest first and take the first 10
  const recent = [...orders]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 10);

  elRecentOrdersTbl.innerHTML = recent.map(order => {
    // Build a compact items summary string
    const itemsList = buildItemsSummary(order.items || []);
    const customer  = (order.customer?.name) || order.customer_name || '—';

    return `
      <tr>
        <td class="td-mono">${escapeHtml(shortId(order.id || order.order_id))}</td>
        <td>${escapeHtml(customer)}</td>
        <td>
          <div class="items-list">${itemsList}</div>
        </td>
        <td>${statusBadge(order.status)}</td>
        <td class="text-right text-mono">${fmt$(order.total ?? order.total_amount)}</td>
      </tr>`;
  }).join('');
}

/**
 * Build a short items summary for the dashboard table.
 * e.g. "×2 Ribeye, ×1 Salad"
 * @param {Array} items
 * @returns {string} HTML string
 */
function buildItemsSummary(items) {
  if (!items.length) return '<span class="text-muted">No items</span>';

  return items.slice(0, 3).map(item => `
    <div class="item-row">
      <span class="item-qty">×${item.quantity || 1}</span>
      <span>${escapeHtml(item.name || 'Item')}</span>
    </div>`).join('') + (items.length > 3
      ? `<div class="item-row text-muted">+${items.length - 3} more</div>`
      : '');
}

// ─── Category Breakdown ───────────────────────────────────────

/**
 * Renders a per-category breakdown table from menu items.
 * Shows category, item count, and how many are currently available.
 * @param {Array} menuItems
 */
function populateCategoryBreakdown(menuItems) {
  if (!elCategoryBreakdown) return;

  if (!menuItems.length) {
    elCategoryBreakdown.innerHTML = `
      <tr><td colspan="3" class="td-muted text-center">No menu data</td></tr>`;
    return;
  }

  // Group by category
  const groups = {};
  menuItems.forEach(item => {
    const cat = item.category || 'Uncategorised';
    if (!groups[cat]) groups[cat] = { total: 0, available: 0 };
    groups[cat].total++;
    if (item.available !== false) groups[cat].available++;
  });

  elCategoryBreakdown.innerHTML = Object.entries(groups)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, counts]) => `
      <tr>
        <td>${escapeHtml(cat)}</td>
        <td class="td-mono">${counts.total}</td>
        <td>
          <span class="badge badge-${counts.available === counts.total ? 'available' : 'unavailable'}">
            ${counts.available}/${counts.total}
          </span>
        </td>
      </tr>`).join('');
}

// ─── State Helpers ────────────────────────────────────────────

/** Show loading placeholders in stat cards */
function setLoadingState() {
  [elTotalMenuItems, elTotalOrders, elPendingOrders].forEach(el => {
    if (el) el.innerHTML = '<span class="spinner-inline"></span>';
  });
  if (elTotalRevenue) elTotalRevenue.innerHTML = '<span class="spinner-inline"></span>';
  if (elRecentOrdersTbl) {
    elRecentOrdersTbl.innerHTML = `
      <tr class="loading-row">
        <td colspan="5">
          <span class="spinner-inline"></span> Loading orders…
        </td>
      </tr>`;
  }
}

/** Show error state in stat cards */
function setErrorState(msg) {
  [elTotalMenuItems, elTotalOrders, elPendingOrders, elTotalRevenue].forEach(el => {
    if (el) el.textContent = '—';
  });
  if (elRecentOrdersTbl) {
    elRecentOrdersTbl.innerHTML = `
      <tr>
        <td colspan="5" class="text-danger text-center" style="padding:20px">
          ✕ ${escapeHtml(msg)}
        </td>
      </tr>`;
  }
}

// ─── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  startAutoRefresh();

  // Refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Refreshing…';
      loadDashboard().finally(() => {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '↻ Refresh';
      });
    });
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  stopAutoRefresh();
});
