// pay.js: Handles payment confirmation for pay.html

function getOrderIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('orderId');
}

async function loadOrderDetails(orderId) {
  try {
    const response = await fetch(`/api/orders/${orderId}`);
    if (response.ok) {
      const order = await response.json();
      return order;
    }
  } catch (err) {
    console.error('Error loading order details:', err);
  }
  return null;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount || 0);
}

document.addEventListener('DOMContentLoaded', async () => {
  const orderId = getOrderIdFromUrl();
  const orderIdDiv = document.getElementById('order-id');
  const orderAmountDiv = document.getElementById('order-amount');
  const paidBtn = document.getElementById('paid-btn');
  const paymentSuccess = document.getElementById('payment-success');

  if (orderIdDiv && orderId) orderIdDiv.textContent = `Order #${orderId}`;

  // Load and display order amount
  if (orderId && orderAmountDiv) {
    const orderDetails = await loadOrderDetails(orderId);
    if (orderDetails && orderDetails.order) {
      orderAmountDiv.textContent = formatCurrency(orderDetails.order.totalAmount);
    } else {
      orderAmountDiv.textContent = 'Amount unavailable';
    }
  }


  if (!paidBtn) return;
  paidBtn.addEventListener('click', async () => {
    paidBtn.disabled = true;
    paidBtn.textContent = 'Processing...';
    paymentSuccess.style.display = 'block';

    let success = false;
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' })
      });
      success = response.ok;
    } catch (_) {
      // Error updating order status
    }

    // Always redirect after delay, regardless of success
    setTimeout(() => {
      window.location.href = `/receipt.html?orderId=${orderId}`;
    }, 1500);
  });
});
