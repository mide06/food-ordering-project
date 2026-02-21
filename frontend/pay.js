// pay.js: Handles payment confirmation for pay.html

function getOrderIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('orderId');
}

document.addEventListener('DOMContentLoaded', () => {
  const orderId = getOrderIdFromUrl();
  const orderIdDiv = document.getElementById('order-id');
  const paidBtn = document.getElementById('paid-btn');
  const paymentSuccess = document.getElementById('payment-success');

  if (orderIdDiv && orderId) orderIdDiv.textContent = `Order #${orderId}`;

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
