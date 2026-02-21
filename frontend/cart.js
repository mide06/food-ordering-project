/**
 * cart.js — Cart page functionality
 * - Renders cart items from localStorage
 * - Update / remove items with live total recalculation
 * - Place order via POST /api/orders
 * - Shows success overlay on completion
 */

// ─── DOM References ───────────────────────────────────────────
const cartItemsEl   = document.getElementById('cart-items');
const emptyCartEl   = document.getElementById('cart-empty');
const cartContentEl = document.getElementById('cart-content');

// Summary values
const subtotalEl    = document.getElementById('summary-subtotal');
const taxEl         = document.getElementById('summary-tax');
const deliveryEl    = document.getElementById('summary-delivery');
const totalEl       = document.getElementById('summary-total');
const itemCountEl   = document.getElementById('summary-item-count');
const placeOrderBtn = document.getElementById('place-order-btn');

// Success overlay
const successOverlay = document.getElementById('order-success-overlay');
const successOrderId = document.getElementById('success-order-id');

// ─── Constants ────────────────────────────────────────────────
const TAX_RATE       = 0.08;   // 8%
const DELIVERY_FEE   = 4.99;   // flat delivery

// ─── Render Cart ──────────────────────────────────────────────

/**
 * Full re-render of the cart page contents
 */
function renderCart() {
  const cart = getCart();

  if (!cart.length) {
    // Empty state
    if (emptyCartEl)   emptyCartEl.style.display   = 'block';
    if (cartContentEl) cartContentEl.style.display = 'none';
    return;
  }

  // Show cart content
  if (emptyCartEl)   emptyCartEl.style.display   = 'none';
  if (cartContentEl) cartContentEl.style.display = 'grid';

  // Render items
  if (cartItemsEl) {
    cartItemsEl.innerHTML = cart.map(item => buildCartItemHtml(item)).join('');
    attachCartItemListeners();
  }

  // Update summary
  updateSummary(cart);
}

/**
 * Build HTML for a single cart row
 * @param {Object} item  - cart item { id, name, price, quantity, emoji }
 * @returns {string}
 */
function buildCartItemHtml(item) {
  return `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-emoji" aria-hidden="true">${item.emoji || '🍽️'}</div>

      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-price-unit">${formatCurrency(item.price)} each</div>
      </div>

      <div class="cart-item-controls">
        <button class="qty-btn decrement-btn"
          data-id="${item.id}"
          aria-label="Decrease quantity of ${escapeHtml(item.name)}">−</button>
        <span class="qty-display">${item.quantity}</span>
        <button class="qty-btn increment-btn"
          data-id="${item.id}"
          aria-label="Increase quantity of ${escapeHtml(item.name)}">+</button>
        <span class="cart-item-total">${formatCurrency(item.price * item.quantity)}</span>
        <button class="remove-btn"
          data-id="${item.id}"
          aria-label="Remove ${escapeHtml(item.name)} from cart"
          title="Remove item">✕</button>
      </div>
    </div>`;
}

/**
 * Attach event listeners to all cart row controls
 */
function attachCartItemListeners() {
  // Increment
  cartItemsEl.querySelectorAll('.increment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = parseId(btn.dataset.id);
      const item = getCart().find(c => c.id === id);
      if (item) updateCartQty(id, item.quantity + 1);
      renderCart();
    });
  });

  // Decrement
  cartItemsEl.querySelectorAll('.decrement-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = parseId(btn.dataset.id);
      const item = getCart().find(c => c.id === id);
      if (item) {
        updateCartQty(id, item.quantity - 1); // removes if 0
        renderCart();
      }
    });
  });

  // Remove
  cartItemsEl.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromCart(parseId(btn.dataset.id));
      renderCart();
    });
  });
}

// ─── Summary Calculation ──────────────────────────────────────

/**
 * Recalculate and display summary totals
 * @param {Array} cart
 */
function updateSummary(cart) {
  const count    = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = getCartSubtotal();
  const tax      = subtotal * TAX_RATE;
  const delivery = subtotal > 0 ? DELIVERY_FEE : 0;
  const total    = subtotal + tax + delivery;

  if (itemCountEl) itemCountEl.textContent = `${count} item${count !== 1 ? 's' : ''}`;
  if (subtotalEl)  subtotalEl.textContent  = formatCurrency(subtotal);
  if (taxEl)       taxEl.textContent       = formatCurrency(tax);
  if (deliveryEl)  deliveryEl.textContent  = formatCurrency(delivery);
  if (totalEl)     totalEl.textContent     = formatCurrency(total);

  // Enable / disable checkout
  if (placeOrderBtn) {
    placeOrderBtn.disabled = cart.length === 0;
  }
}

// ─── Place Order ──────────────────────────────────────────────

/**
 * Validate form and submit order to API
 */
async function handlePlaceOrder() {
  const cart = getCart();
  if (!cart.length) return;

  // Build order payload using authenticated user data
  const user = getUser(); // Get logged-in user data
  const orderPayload = {
    items: cart.map(item => ({
      menuItemId: item.id,
      quantity: item.quantity
    }))
  };

  // Include customer info if user is logged in
  if (user) {
    orderPayload.customer = {
      name: user.name || 'Guest',
      email: user.email || '',
      note: ''
    };
  }

  // Disable button & show loading state
  placeOrderBtn.disabled     = true;
  placeOrderBtn.textContent  = 'Placing Order…';

  try {
    const result = await placeOrder(orderPayload);

    // Success!
    clearCart();
    renderCart();

    const orderId = result.id || result.order_id;
    if (orderId) {
      // Redirect to payment page immediately
      window.location.href = `payment.html?orderId=${orderId}`;
      return;
    }

  } catch (err) {
     // Order failed
    showToast('Could not place order. Please check your connection and try again.', 'error');

    placeOrderBtn.disabled    = false;
    placeOrderBtn.textContent = 'Place Order';
  }
}

// ─── Success Overlay ──────────────────────────────────────────

/**
 * Wire up the success overlay close / redirect buttons
 */
function initSuccessOverlay() {
  const viewOrdersBtn  = document.getElementById('success-view-orders');
  const continueBtn    = document.getElementById('success-continue');

  if (viewOrdersBtn) {
    viewOrdersBtn.addEventListener('click', () => {
      window.location.href = 'orders.html';
    });
  }

  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      successOverlay.classList.remove('show');
      window.location.href = 'menu.html';
    });
  }

  // Clicking the backdrop dismisses
  if (successOverlay) {
    successOverlay.addEventListener('click', e => {
      if (e.target === successOverlay) {
        successOverlay.classList.remove('show');
      }
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Parse an ID that may be a string or number
 */
function parseId(val) {
  const n = parseInt(val, 10);
  return isNaN(n) ? val : n;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  initSuccessOverlay();

  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', handlePlaceOrder);
  }
});
