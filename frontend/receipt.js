// receipt.js: Load and display order receipt details

/**
 * Get order ID from URL parameters
 * @returns {string|null} Order ID or null if not found
 */
function getOrderIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('orderId');
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
  return `₦${parseFloat(amount).toFixed(2)}`;
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
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
 * Load and display order receipt
 * @param {string} orderId - Order ID to load
 */
async function loadOrderReceipt(orderId) {
  const loadingDiv = document.getElementById('loading');
  const errorDiv = document.getElementById('error');
  const receiptDiv = document.getElementById('receipt-data');
  const errorMessage = document.getElementById('error-message');

  // Show loading state
  loadingDiv.style.display = 'block';
  errorDiv.style.display = 'none';
  receiptDiv.style.display = 'none';

  let order = null;
  try {
    const response = await fetch(`/api/orders/${orderId}`);
    if (!response.ok) throw new Error(`Failed to load order: ${response.statusText}`);
    const data = await response.json();
    order = data.order;
    if (!order) throw new Error('Order not found');
  } catch (error) {
    loadingDiv.style.display = 'none';
    errorDiv.style.display = 'block';
    receiptDiv.style.display = 'none';
    errorMessage.textContent = error.message || 'Unable to load receipt. Please try again.';
    return;
  }

  // Hide loading and show receipt
  loadingDiv.style.display = 'none';
  receiptDiv.style.display = 'block';

  // Populate order information
  document.getElementById('order-id').textContent = order.id;
  document.getElementById('order-number').textContent = order.orderNumber || `ORD-${order.id}`;
  document.getElementById('order-date').textContent = formatDate(order.createdAt);
  document.getElementById('order-status').textContent = (order.status || 'pending').toUpperCase();
  document.getElementById('delivery-address').textContent = order.deliveryAddress || 'Not specified';
  document.getElementById('total-amount').textContent = formatCurrency(order.totalAmount);

  // Set customer name
  const currentUser = getCurrentUser();
  let customerName = order.customerName || order.customer_name || (currentUser && (currentUser.name || currentUser.email.split('@')[0])) || 'Guest Customer';
  document.getElementById('customer-name').textContent = customerName;

  // Populate order items
  const itemsContainer = document.getElementById('order-items');
  if (order.OrderItems && order.OrderItems.length > 0) {
    itemsContainer.innerHTML = order.OrderItems.map(item => {
      const menuItem = item.MenuItem;
      const itemTotal = parseFloat(item.unitPrice) * parseInt(item.quantity);
      const itemName = menuItem?.name || 'Unknown Item';
      const itemDescription = menuItem?.description || 'Menu item';
      return `
        <div class="menu-item">
          <div class="item-details">
            <div class="item-name">${itemName}</div>
            <div class="item-description">${itemDescription}</div>
            <div style="margin-top: 5px; color: #666; font-size: 0.9em;">
              ${formatCurrency(item.unitPrice)} × ${item.quantity}
            </div>
          </div>
          <div class="item-quantity">×${item.quantity}</div>
          <div class="item-price">${formatCurrency(itemTotal)}</div>
        </div>
      `;
    }).join('');
  } else {
    itemsContainer.innerHTML = '<p style="text-align: center; color: #666;">No items found</p>';
  }

  // Update page title
  document.title = `Receipt #${order.orderNumber || order.id} - FUL RESTAURANT`;
}

/**
 * Update order status to paid (optional - for marking payment as confirmed)
 * @param {string} orderId - Order ID to update
 */
async function markOrderAsPaid(orderId) {
  try {
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'paid' })
    });

    if (!response.ok) {
      // Failed to update order status to paid
    } else {
      // Order marked as paid successfully
    }
  } catch (error) {
     // Error updating order status
  }
}

/**
 * Save receipt to user's order history (localStorage for now)
 * @param {string} orderId - Order ID to save
 */
function saveToOrderHistory(orderId) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) return; // Only save for logged-in users

    let orderHistory = JSON.parse(localStorage.getItem('order_history') || '[]');
    
    // Check if order is already in history
    if (!orderHistory.includes(orderId)) {
      orderHistory.unshift(orderId); // Add to beginning of array
      
      // Keep only last 50 orders
      if (orderHistory.length > 50) {
        orderHistory = orderHistory.slice(0, 50);
      }
      
      localStorage.setItem('order_history', JSON.stringify(orderHistory));
        // Order saved to history
    }
  } catch (error) {
       // Error saving to order history
  }
}

// Initialize receipt page
document.addEventListener('DOMContentLoaded', () => {
  const orderId = getOrderIdFromUrl();
  
  if (!orderId) {
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    
    loadingDiv.style.display = 'none';
    errorDiv.style.display = 'block';
    errorMessage.textContent = 'No order ID provided. Please access this page through a valid payment confirmation.';
    return;
  }

  // Load the order receipt
  loadOrderReceipt(orderId);
  
  // Mark order as paid and save to history
  markOrderAsPaid(orderId);
  saveToOrderHistory(orderId);
});

// Add print functionality
window.addEventListener('beforeprint', () => {
  document.title = `Receipt #${document.getElementById('order-number')?.textContent || 'Unknown'} - FUL RESTAURANT`;
});