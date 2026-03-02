/**
 * admin-orders.js
 * Admin Orders page logic.
 *
 * API calls wired up:
 *   GET   /api/orders               → load and render all orders
 *   PATCH /api/orders/:id/status    → update order status via dropdown
 */

// ─── Constants ────────────────────────────────────────────────

/** All valid status values (matches backend Order model enum) */
const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];

// ─── State ────────────────────────────────────────────────────
let ordersData     = [];       // cached orders from last fetch
let activeFilter   = 'all';    // current status filter tab
let refreshInterval = null;    // for real-time updates
let isRefreshing   = false;    // prevent overlapping refreshes

// ─── DOM refs ──────────────────────────────────────────────────
const ordersTbody   = document.getElementById('orders-tbody');
const orderCount    = document.getElementById('order-count');
const filterTabs    = document.getElementById('filter-tabs');
const searchInput   = document.getElementById('orders-search');

// ─── Load Orders ──────────────────────────────────────────────

/**
 * Fetch all orders from GET /api/orders and render the table.
 * Also updates the count badge and filter tab counts.
 * @param {boolean} silent - If true, don't show loading state (for background refreshes)
 */
async function loadOrders(silent = false) {
  if (isRefreshing && silent) return; // Avoid overlapping background refreshes
  isRefreshing = true;
  
  if (!silent) setTableLoading();
  
  try {
    console.log('[Orders] Fetching latest orders...');
      // Fetching latest orders
    const data = await getOrders();
      // Raw API response
    
    // Handle different response formats from the API
    let orders = [];
    if (Array.isArray(data)) {
      orders = data;
    } else if (data && data.orders && Array.isArray(data.orders)) {
      orders = data.orders;
    } else {
      console.warn('[Orders] Unexpected API response format:', data);
        // Unexpected API response format
      orders = [];
    }
    
    console.log('[Orders] Extracted orders:', orders);
      // Extracted orders

    // Transform orders to match expected format
    ordersData = orders.map(order => {
      console.log(`[Orders] Processing order ${order.id}:`, order);
        // Processing order
      console.log(`[Orders] Order ${order.id} OrderItems:`, order.OrderItems);
        // Order OrderItems
      
      const transformedOrder = {
        id: order.id,
        order_id: order.id,
        status: order.status || 'pending',
        created_at: order.createdAt || order.created_at,
        total_amount: order.totalAmount || order.total_amount || 0,
        customer_name: order.customerName || order.customer_name || 'Guest',
        deliveryAddress: order.deliveryAddress,
        orderNumber: order.orderNumber,
        items: (order.OrderItems || order.items || []).map(item => {
          console.log(`[Orders] Processing item for order ${order.id}:`, item);
            // Processing item for order
          console.log(`[Orders] Item MenuItem:`, item.MenuItem);
            // Item MenuItem
          
          return {
            id: item.id,
            name: item.MenuItem?.name || item.name || 'Unknown Item',
            quantity: item.quantity || 1,
            price: item.unitPrice || item.price || 0
          };
        })
      };
      
      console.log(`[Orders] Transformed order ${order.id}:`, transformedOrder);
        // Transformed order
      return transformedOrder;
    });

    renderFilterTabs(ordersData);
    renderOrdersTable(getFilteredOrders());

    if (orderCount) {
      orderCount.textContent = `${ordersData.length} total`;
    }
    
    // Update last refreshed timestamp
    const lastUpdated = document.getElementById('last-updated');
    if (lastUpdated) {
      const now = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
      lastUpdated.textContent = `Updated: ${now}`;
    }

    if (!silent) {
      // Loaded orders successfully
    }

  } catch (err) {
    console.error('[Orders] Load error:', err);
      // Orders Load error
    if (!silent) {
      showToast(err.message, 'error');
      setTableError(err.message);
    }
  } finally {
    isRefreshing = false;
  }
}

/**
 * Start automatic refresh every 30 seconds for real-time updates
 */
function startRealTimeUpdates() {
  // Clear any existing interval
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  // Set up new interval for background refreshes
  refreshInterval = setInterval(() => {
    // Add subtle visual indication of background refresh
    const lastUpdated = document.getElementById('last-updated');
    if (lastUpdated) {
      lastUpdated.innerHTML = '<span class="spinner-inline" style="width: 12px; height: 12px;"></span> Updating...';
    }
    
    loadOrders(true); // Silent refresh
  }, 30000); // 30 seconds
  
  console.log('[Orders] Real-time updates started (30s intervals)');
    // Real-time updates started
}

/**
 * Stop automatic refresh
 */
function stopRealTimeUpdates() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('[Orders] Real-time updates stopped');
      // Real-time updates stopped
  }
}

// ─── Filter Tabs ──────────────────────────────────────────────

/**
 * Build the status filter tab buttons with per-status counts.
 * @param {Array} orders
 */
function renderFilterTabs(orders) {
  if (!filterTabs) return;

  const tabs = ['all', ...ORDER_STATUSES];

  filterTabs.innerHTML = tabs.map(tab => {
    const count = tab === 'all'
      ? orders.length
      : orders.filter(o => (o.status || '').toLowerCase() === tab).length;

    return `
      <button class="filter-tab ${tab === activeFilter ? 'active' : ''}"
        data-filter="${tab}">
        ${capitalise(tab)}
        <span class="tab-count">${count}</span>
      </button>`;
  }).join('');

  filterTabs.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      filterTabs.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderOrdersTable(getFilteredOrders());
    });
  });
}

/**
 * Apply the current active filter (and optional search) to ordersData.
 * @returns {Array}
 */
function getFilteredOrders() {
  let result = activeFilter === 'all'
    ? ordersData
    : ordersData.filter(o => (o.status || '').toLowerCase() === activeFilter);

  // Also apply search if there's a query
  const q = searchInput?.value.toLowerCase().trim();
  if (q) {
    result = result.filter(o => {
      const id       = String(o.id || o.order_id || '').toLowerCase();
      const customer = (o.customer?.name || o.customer_name || '').toLowerCase();
      const items    = (o.items || []).map(i => i.name || '').join(' ').toLowerCase();
      return id.includes(q) || customer.includes(q) || items.includes(q);
    });
  }

  // Sort newest first
  return [...result].sort((a, b) =>
    new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );
}

// ─── Render Table ─────────────────────────────────────────────

/**
 * Render the orders table from a (possibly filtered) array.
 * Each row includes a status dropdown that fires PATCH on change.
 * @param {Array} orders
 */
function renderOrdersTable(orders) {
  if (!ordersTbody) return;

  if (!orders.length) {
    ordersTbody.innerHTML = `
      <tr>
        <td colspan="6" class="table-state">
          <div class="state-icon">📋</div>
          No orders ${activeFilter !== 'all' ? `with status "${activeFilter}"` : 'found'}.
        </td>
      </tr>`;
    return;
  }

  ordersTbody.innerHTML = orders.map(order => buildOrderRow(order)).join('');
  attachStatusDropdownListeners();
}

/**
 * Build a single order row HTML.
 * @param {Object} order
 * @returns {string}
 */
function buildOrderRow(order) {
  const id       = order.id || order.order_id;
  const customer = order.customer_name || order.customerName || 'Guest Customer';
  const status   = (order.status || 'pending').toLowerCase();
  const date     = fmtDate(order.created_at);
  const total    = fmt$(order.total_amount);
  const items    = order.items || [];
  const orderNum = order.orderNumber || `ORD-${id}`;
  const address  = order.deliveryAddress || 'Not specified';

  // Build status dropdown options
  const statusOptions = ORDER_STATUSES.map(s => `
    <option value="${s}" ${status === s ? 'selected' : ''}>${capitalise(s)}</option>
  `).join('');

  // Build items list (compact)
  const itemsHtml = items.length
    ? items.map(i => `
        <div class="item-row" style="margin-bottom: 4px; font-size: 0.8rem;">
          <span class="item-qty" style="background: var(--bg); padding: 2px 6px; border-radius: 3px; margin-right: 8px; font-family: var(--mono);">×${i.quantity || 1}</span>
          <span>${escapeHtml(i.name || 'Item')}</span>
          <span class="text-muted" style="margin-left: 8px;">${fmt$(i.price * i.quantity)}</span>
        </div>`).join('')
    : '<span class="text-muted">No items</span>';

  return `
    <tr data-order-id="${escapeHtml(String(id))}" style="border-bottom: 1px solid var(--border);">
      <td class="td-mono" style="font-size:0.78rem; padding: 12px 8px;">
        <strong>${escapeHtml(shortId(orderNum))}</strong>
        <div class="text-muted mt-4" style="font-size:0.7rem">${date}</div>
        <div class="text-muted" style="font-size:0.7rem">ID: ${id}</div>
      </td>
      <td style="padding: 12px 8px;">
        <div><strong>${escapeHtml(customer)}</strong></div>
        <div class="text-muted" style="font-size: 0.8rem; margin-top: 4px;">${escapeHtml(address)}</div>
      </td>
      <td style="padding: 12px 8px;">
        <div class="items-list">${itemsHtml}</div>
      </td>
      <td style="padding: 12px 8px;">${statusBadge(status)}</td>
      <td style="padding: 12px 8px;">
        <!--
          Status dropdown — onChange triggers PATCH /api/orders/:id/status
          The badge in the previous column is updated immediately (optimistic UI).
        -->
        <select class="status-select form-input" data-order-id="${escapeHtml(String(id))}" style="font-size: 0.8rem;">
          ${statusOptions}
        </select>
        <div class="status-msg text-muted mt-4" style="font-size:0.7rem;min-height:14px"></div>
      </td>
      <td class="text-right td-mono" style="padding: 12px 8px;">
        <strong>${total}</strong>
        <div class="text-muted" style="font-size: 0.7rem;">${items.length} item${items.length !== 1 ? 's' : ''}</div>
      </td>
    </tr>`;
}

// ─── Status Dropdown Handler ──────────────────────────────────

/**
 * Attach change listeners to all status select dropdowns.
 * Uses event delegation on the tbody for efficiency.
 *
 * On change: PATCH /api/orders/:id/status { status: 'newValue' }
 * Updates the badge cell optimistically; reverts on error.
 */
function attachStatusDropdownListeners() {
  if (!ordersTbody) return;

  // Remove old listener if any (avoid duplicates)
  ordersTbody.removeEventListener('change', onStatusChange);
  ordersTbody.addEventListener('change', onStatusChange);
}

/**
 * Delegated change handler for status selects.
 * @param {Event} e
 */
async function onStatusChange(e) {
  const select = e.target.closest('.status-select');
  if (!select) return;

  const orderId  = select.dataset.orderId;
  const newStatus = select.value;

  const row     = select.closest('tr');
  const badgeCell = row?.querySelector('.badge');
  const msgEl   = row?.querySelector('.status-msg');

  // Save previous value in case we need to revert
  const previousStatus = ordersData.find(
    o => String(o.id || o.order_id) === String(orderId)
  )?.status || 'pending';

  // Optimistic UI — update badge immediately
  if (badgeCell) badgeCell.outerHTML = statusBadge(newStatus);
  if (msgEl) {
    msgEl.innerHTML = '<span class="spinner-inline" style="width: 12px; height: 12px;"></span> Saving...';
    msgEl.classList.remove('text-danger');
  }
  select.disabled = true;

  try {
    // PATCH /api/orders/:id/status with { status: newStatus }
    await updateOrderStatus(orderId, newStatus);

    // Update local cache
    const order = ordersData.find(o => String(o.id || o.order_id) === String(orderId));
    if (order) order.status = newStatus;

    if (msgEl) {
      msgEl.textContent = 'Saved';
      setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 2000);
    }

    // Refresh filter tab counts
    renderFilterTabs(ordersData);

    // Notify dashboard to refresh stats (revenue, etc.)
    try {
      window.parent.postMessage({ type: 'refresh-dashboard' }, '*');
    } catch (e) { /* ignore */ }

  } catch (err) {
    console.error('[Orders] Status update error:', err);

    // Revert dropdown
    select.value = previousStatus;

    // Revert badge
    const newBadgeEl = row?.querySelector('.badge');
    if (newBadgeEl) newBadgeEl.outerHTML = statusBadge(previousStatus);

    if (msgEl) {
      msgEl.textContent = '✕ Failed';
      msgEl.classList.add('text-danger');
    }

    showToast(`Could not update status: ${err.message}`, 'error');

  } finally {
    select.disabled = false;
  }
}

// ─── State Helpers ────────────────────────────────────────────

function setTableLoading() {
  if (!ordersTbody) return;
  ordersTbody.innerHTML = `
    <tr class="loading-row">
      <td colspan="6">
        <span class="spinner-inline"></span> Loading orders…
      </td>
    </tr>`;
}

function setTableError(msg) {
  if (!ordersTbody) return;
  ordersTbody.innerHTML = `
    <tr>
      <td colspan="6" class="text-danger text-center" style="padding:24px">
        ✕ ${escapeHtml(msg)}
      </td>
    </tr>`;
}

// ─── Helpers ──────────────────────────────────────────────────
function capitalise(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// ─── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Initial load
  loadOrders();
  
  // Start real-time updates
  startRealTimeUpdates();

  // Refresh button
  const refreshBtn = document.getElementById('refresh-orders-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '<span class="spinner-inline"></span> Refreshing…';
      loadOrders().finally(() => {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '↻ Refresh';
      });
    });
  }

  // Search input - live filtering
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderOrdersTable(getFilteredOrders());
    });
  }
  
  // Add real-time indicator to show updates are active
  const topbarRight = document.querySelector('.topbar-right');
  if (topbarRight) {
    const indicator = document.createElement('span');
    indicator.innerHTML = '<span style="color: #28a745; font-size: 0.8rem;">● Live</span>';
    indicator.style.marginRight = '12px';
    topbarRight.insertBefore(indicator, topbarRight.firstChild);
  }
  
  console.log('[Orders] Admin orders page initialized with real-time updates');
    // Admin orders page initialized with real-time updates
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  stopRealTimeUpdates();
});
