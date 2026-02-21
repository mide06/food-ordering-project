// payment.js: Fetch and display QR code for payment

function getOrderIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('orderId');
}

async function showQrForOrder(orderId) {
  const qrDiv = document.getElementById('qr');
  const orderIdDiv = document.getElementById('order-id');
  const payUrlDiv = document.getElementById('pay-url');
  const errorDiv = document.getElementById('qr-error');
  if (!orderId) {
    errorDiv.textContent = 'No order ID provided.';
    return;
  }
  orderIdDiv.textContent = `Order #${orderId}`;
  try {
    const res = await fetch(`http://localhost:3000/api/orders/${orderId}/qr`);
    if (!res.ok) throw new Error('Could not fetch QR code');
    const data = await res.json();
    const img = document.createElement('img');
    img.src = data.qr;
    img.alt = 'Scan to pay';
    qrDiv.appendChild(img);
    payUrlDiv.textContent = data.paymentUrl;
  } catch (e) {
    errorDiv.textContent = 'Failed to load QR code. Please try again.';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const orderId = getOrderIdFromUrl();
  showQrForOrder(orderId);
});
