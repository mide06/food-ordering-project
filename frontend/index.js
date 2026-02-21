// ─── Featured Items Loading ───────────────────────────────────────
async function loadFeaturedItems() {
  try {
    const response = await fetch('/api/menu?featured=true');
    const items = await response.json();
    
    const container = document.getElementById('featured-items');
    if (!container) return;
    
    container.innerHTML = items.map(item => `
      <div class="menu-item" data-id="${item.id}">
        <img src="${item.image || '/api/placeholder/300/200'}" alt="${item.name}" class="menu-item-image">
        <div class="menu-item-content">
          <h3 class="menu-item-title">${item.name}</h3>
          <p class="menu-item-description">${item.description}</p>
          <div class="menu-item-footer">
            <span class="menu-item-price">₦${parseFloat(item.price).toFixed(2)}</span>
            <button class="btn btn-primary add-to-cart-btn" onclick="addToCart(${item.id})">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
     // Error loading featured items
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedItems();
  // User authentication display handled by utils.js
});
