// Navigate to product details page
function goToProduct(productId) {
  window.location.href = `/product/${productId}`;
}

// Global state
let isLoading = false;

/* ================================
   AUTO LOAD PRODUCTS ON PAGE LOAD
   ================================ */
document.addEventListener("DOMContentLoaded", () => {
  const url = new URL(window.location);
  if (url.searchParams.toString()) {
    fetchProducts();
  }
});

// Brand filter with toggle
function brandFilter(element) {
  if (isLoading) return;

  const brandValue = element.getAttribute("data-value");
  const input = element.querySelector('input[type="radio"]');
  const url = new URL(window.location);
  const currentBrand = url.searchParams.get("brand");

  if (currentBrand === brandValue && input.checked) {
    input.checked = false;
    deleteURLParam("brand");
  } else {
    updateURLParam("brand", brandValue);
  }

  updateURLParam("page", 1);
  fetchProducts();
}

// Category filter with toggle
function categoryFilter(element) {
  if (isLoading) return;

  const categoryValue = element.getAttribute("data-value");
  const input = element.querySelector('input[type="radio"]');
  const url = new URL(window.location);
  const currentCategory = url.searchParams.get("category");

  if (currentCategory === categoryValue && input.checked) {
    input.checked = false;
    deleteURLParam("category");
  } else {
    updateURLParam("category", categoryValue);
  }

  updateURLParam("page", 1);
  fetchProducts();
}

// Apply filters
function applyFilter() {
  if (isLoading) return;

  const sortBy = document.getElementById("sort-by")?.value || "";
  const minPrice = document.getElementById("price-from")?.value || "";
  const maxPrice = document.getElementById("price-to")?.value || "";

  updateURLParam("sort", sortBy);
  updateURLParam("priceMin", minPrice);
  updateURLParam("priceMax", maxPrice);
  updateURLParam("page", 1);

  fetchProducts();
}

// Clear filters (keeps search)
function clearFilters() {
  if (isLoading) return;

  const priceFrom = document.getElementById("price-from");
  const priceTo = document.getElementById("price-to");
  const sortBy = document.getElementById("sort-by");

  if (priceFrom) priceFrom.value = "";
  if (priceTo) priceTo.value = "";
  if (sortBy) sortBy.value = "";

  document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);

  const url = new URL(window.location);
  url.searchParams.delete("category");
  url.searchParams.delete("brand");
  url.searchParams.delete("sort");
  url.searchParams.delete("priceMin");
  url.searchParams.delete("priceMax");
  url.searchParams.delete("page");

  window.history.pushState({}, "", url);
  fetchProducts();
}

// Change pagination page
function changePage(page) {
  if (isLoading) return;

  updateURLParam("page", page);
  fetchProducts();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// URL helpers
function updateURLParam(key, value) {
  const url = new URL(window.location);
  value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
  window.history.pushState({}, "", url);
}

function deleteURLParam(key) {
  const url = new URL(window.location);
  url.searchParams.delete(key);
  window.history.pushState({}, "", url);
}

// Show loading spinner
function showLoadingSpinner() {
  const existingSpinner = document.querySelector('.mini-spinner');
  if (existingSpinner) return;

  const spinner = document.createElement('div');
  spinner.className = 'mini-spinner';
  spinner.innerHTML = '<i class="fa-solid fa-spinner"></i> Loading...';
  document.body.appendChild(spinner);
}

// Hide loading spinner
function hideLoadingSpinner() {
  const spinner = document.querySelector('.mini-spinner');
  if (spinner) {
    spinner.remove();
  }
}

// Fetch products
async function fetchProducts() {
  if (isLoading) return;
  isLoading = true;

  showLoadingSpinner();

  try {
    const url = window.location.pathname + window.location.search;

    const response = await axios.get(url, {
      headers: { "X-Requested-With": "XMLHttpRequest" }
    });

    const data = response.data;
    if (!data.success || !Array.isArray(data.products)) {
      showErrorState();
      return;
    }

    updateProductGrid(data.products);
    updatePagination(data.currentPage, data.totalPages);
    updateBreadcrumbs(data.query);
    syncFiltersFromURL();

  } catch (err) {
    console.error("Fetch error:", err);
    showErrorState();
  } finally {
    isLoading = false;
    hideLoadingSpinner();
  }
}

function updateProductGrid(products) {
  const grid = document.querySelector(".product-grid");
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="no-products">
        <i class="fa-solid fa-box-open"></i>
        <p>No products found matching your criteria.</p>
        <button onclick="clearFilters()" class="clear-btn-inline">Clear Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(product => {
    const regularPrice = product.regularPrice || 0;
    const salePrice = product.salePrice || 0;
    const offerAmount = product.discountAmount || 0;
    const currentPrice = Math.max(0, salePrice - offerAmount);
    const discountPercent = regularPrice > currentPrice
      ? Math.round(((regularPrice - currentPrice) / regularPrice) * 100)
      : 0;
    const hasDiscount = discountPercent > 0;
    const savings = regularPrice - currentPrice;

    return `
<style>
/* ===== Product Card Styles ===== */
.product-card {
  position: relative;
  background: linear-gradient(145deg, #FAF8F3 0%, #F0EBE1 100%);
  border-radius: 25px;
  padding: 25px;
  box-shadow: 
    0 15px 40px rgba(31, 31, 31, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 2px solid transparent;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: center;
  display: flex;
  flex-direction: column;
  overflow: visible;
  cursor: pointer;
}

.product-card::before {
  content: "";
  position: absolute;
  top: -100%;
  left: -100%;
  width: 300%;
  height: 300%;
  background: radial-gradient(circle, rgba(201, 164, 92, 0.15), transparent 50%);
  opacity: 0;
  transition: opacity 0.6s ease;
  pointer-events: none;
}

.product-card::after {
  content: "";
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(135deg, #C9A45C, #7A8B5A);
  opacity: 0;
  transition: opacity 0.5s ease;
  border-radius: 25px;
  z-index: -1;
}

.product-card:hover::before {
  opacity: 1;
  top: -50%;
  left: -50%;
}

.product-card:hover::after {
  opacity: 1;
}

.product-card:hover {
  transform: translateY(-15px) scale(1.02);
  box-shadow: 
    0 30px 70px rgba(201, 164, 92, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.product-card .image-container {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  background: #FFFFFF;
  margin-bottom: 22px;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.05);
  isolation: isolate;
}

.product-card .image-container::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg, 
    transparent 0%, 
    transparent 60%,
    rgba(201, 164, 92, 0.15) 100%
  );
  opacity: 0;
  transition: opacity 0.5s ease;
  z-index: 1;
  pointer-events: none;
}

.product-card .image-container:hover::before {
  opacity: 1;
}

.product-card .image-container img {
  width: 100%;
  height: 240px;
  object-fit: cover;
  border-radius: 20px;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  display: block;
}

.product-card .image-container:hover img {
  transform: scale(1.12) rotate(2deg);
}

.product-card .offer-badge {
  position: absolute;
  top: 15px;
  left: 15px;
  background: linear-gradient(135deg, #C9A45C 0%, #B89350 100%);
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 800;
  padding: 8px 16px;
  border-radius: 25px;
  z-index: 2;
  letter-spacing: 1px;
  box-shadow: 
    0 6px 20px rgba(201, 164, 92, 0.5),
    inset 0 -2px 5px rgba(0, 0, 0, 0.2);
  animation: badgePulse 2.5s ease-in-out infinite;
  text-transform: uppercase;
}

@keyframes badgePulse {
  0%, 100% { 
    transform: scale(1); 
    box-shadow: 0 6px 20px rgba(201, 164, 92, 0.5); 
  }
  50% { 
    transform: scale(1.08); 
    box-shadow: 0 8px 25px rgba(201, 164, 92, 0.7); 
  }
}

.product-card .wishlist-icon {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 20;
  width: 38px;
  height: 38px;
  background: #FFFFFF;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.product-card .wishlist-icon:hover {
  transform: scale(1.12);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
}

.product-card .wishlist-icon:active {
  transform: scale(0.95);
}

.product-card .wishlist-icon i {
  font-size: 18px;
  color: #E91E63;
  transition: color 0.2s ease;
}

.product-card .wishlist-icon.active i {
  color: #C2185B;
}

.product-card h3 {
  margin: 18px 0 12px;
  font-size: 1.05rem;
  color: #2B2B2B;
  font-weight: 700;
  line-height: 1.5;
  min-height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.3px;
  transition: color 0.3s ease;
  font-family: 'Playfair Display', serif;
}

.product-card h3:hover {
  color: #C9A45C;
}

.product-card .category {
  display: inline-block;
  background: linear-gradient(135deg, 
    rgba(201, 164, 92, 0.2), 
    rgba(122, 139, 90, 0.2));
  color: #6B4A2D;
  font-weight: 700;
  padding: 7px 16px;
  border-radius: 25px;
  font-size: 0.8rem;
  margin-bottom: 14px;
  border: 1px solid rgba(201, 164, 92, 0.4);
  box-shadow: 0 2px 8px rgba(201, 164, 92, 0.15);
  width: auto;
  cursor: default;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-family: 'Lato', sans-serif;
}

.product-card .price {
  margin-top: auto;
  padding-top: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

.product-card .price .sale {
  color: #C9A45C;
  font-size: 1.5rem;
  font-weight: 900;
  text-shadow: 0 2px 8px rgba(201, 164, 92, 0.3);
  letter-spacing: -0.5px;
  font-family: 'Lato', sans-serif;
}

.product-card .price .regular {
  color: #999999;
  text-decoration: line-through;
  font-size: 1rem;
  font-weight: 600;
  font-family: 'Lato', sans-serif;
}

.product-card .savings-text {
  color: #4CAF50;
  font-size: 0.85rem;
  font-weight: 600;
  margin-top: 8px;
  font-family: 'Lato', sans-serif;
}

.product-card .add-to-cart {
  background: linear-gradient(135deg, #7A8B5A 0%, #6A7A4E 100%);
  color: #FFFFFF;
  border: none;
  padding: 14px 32px;
  border-radius: 30px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 18px;
  font-weight: 700;
  box-shadow: 
    0 8px 25px rgba(122, 139, 90, 0.3),
    inset 0 -2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-family: 'Lato', sans-serif;
}

.product-card .add-to-cart::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #8A9B6A 0%, #7A8B5A 100%);
  transition: left 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -1;
}

.product-card .add-to-cart:hover::before {
  left: 0;
}

.product-card .add-to-cart:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 
    0 12px 35px rgba(122, 139, 90, 0.4),
    inset 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.product-card .add-to-cart:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

      <div class="product-card">
        <button 
          class="wishlist-icon ${product.isInWishlist ? 'active' : ''}"
          onclick="toggleWishlist(event, '${product.variantId}')"
          aria-label="Add to wishlist">
          <i class="${product.isInWishlist ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
        </button>

        <div class="image-container" onclick="goToProduct('${product._id}')">
          <img 
            src="${product.images?.[0] || ''}" 
            alt="${product.name}"
            loading="lazy">

          ${hasDiscount ? `<span class="offer-badge">${discountPercent}% OFF</span>` : ''}
        </div>

        <h3 onclick="goToProduct('${product._id}')">
          ${product.name}
        </h3>

        <p class="category">
          ${product.category?.name || ''}
        </p>

        <div class="price">
          <span class="sale">
            ₹${currentPrice.toLocaleString('en-IN')}
          </span>
          ${hasDiscount ? `
            <span class="regular">
              ₹${regularPrice.toLocaleString('en-IN')}
            </span>
          ` : ''}
        </div>

        ${offerAmount > 0 && savings > 0 ? `
          <p class="savings-text">
            Save ₹${savings.toLocaleString('en-IN')} with offers
          </p>
        ` : ''}

        <button 
          class="add-to-cart"
          onclick="addToCart(event, '${product.variantId}')">
          Add to Cart
        </button>
      </div>
    `;
  }).join("");
}

function updatePagination(currentPage, totalPages) {
  const paginationContainer = document.querySelector('.pagination');
  if (!paginationContainer) return;

  if (totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }

  paginationContainer.style.display = 'flex';

  let html = '';

  // Previous button
  if (currentPage > 1) {
    html += `
      <button onclick="changePage(${currentPage - 1})" class="page-btn prev-btn">
        <i class="fa-solid fa-chevron-left"></i> Prev
      </button>
    `;
  }

  // Page number logic
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (currentPage <= 3) {
    endPage = Math.min(5, totalPages);
  }
  if (currentPage > totalPages - 3) {
    startPage = Math.max(1, totalPages - 4);
  }

  // First page
  if (startPage > 1) {
    html += `<button onclick="changePage(1)" class="page-btn">1</button>`;
    if (startPage > 2) {
      html += `<span class="page-ellipsis">...</span>`;
    }
  }

  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button 
        onclick="changePage(${i})" 
        class="page-btn ${i === currentPage ? 'active' : ''}">
        ${i}
      </button>
    `;
  }

  // Last page
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="page-ellipsis">...</span>`;
    }
    html += `<button onclick="changePage(${totalPages})" class="page-btn">${totalPages}</button>`;
  }

  // Next button
  if (currentPage < totalPages) {
    html += `
      <button onclick="changePage(${currentPage + 1})" class="page-btn next-btn">
        Next <i class="fa-solid fa-chevron-right"></i>
      </button>
    `;
  }

  paginationContainer.innerHTML = html;
}

function updateBreadcrumbs(query) {
  const breadcrumb = document.querySelector('.breadcrumb');
  if (!breadcrumb) return;

  let html = '<a href="/"><i class="fa-solid fa-house"></i> Home</a>';
  html += '<span class="separator">›</span>';

  if (query.category) {
    html += `<a href="/products?category=${query.category}">${query.category}</a>`;
    if (query.brand) {
      html += '<span class="separator">›</span>';
      html += `<a href="/products?category=${query.category}&brand=${query.brand}">${query.brand}</a>`;
    }
  } else if (query.brand) {
    html += `<a href="/products?brand=${query.brand}">${query.brand}</a>`;
  } else {
    html += '<span class="current">All Products</span>';
  }

  breadcrumb.innerHTML = html;
}

function syncFiltersFromURL() {
  const url = new URL(window.location);

  // Sync category
  const category = url.searchParams.get('category');
  document.querySelectorAll('input[name="category"]').forEach(input => {
    input.checked = input.value === category;
  });

  // Sync brand
  const brand = url.searchParams.get('brand');
  document.querySelectorAll('input[name="brand"]').forEach(input => {
    input.checked = input.value === brand;
  });

  // Sync price
  const priceFrom = document.getElementById('price-from');
  const priceTo = document.getElementById('price-to');
  if (priceFrom) priceFrom.value = url.searchParams.get('priceMin') || '';
  if (priceTo) priceTo.value = url.searchParams.get('priceMax') || '';

  // Sync sort
  const sortBy = document.getElementById('sort-by');
  if (sortBy) sortBy.value = url.searchParams.get('sort') || '';
}

function showErrorState() {
  const grid = document.querySelector('.product-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="error-state">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <p>Failed to load products. Please try again.</p>
      <button onclick="fetchProducts()" class="retry-btn">
        <i class="fa-solid fa-rotate-right"></i> Retry
      </button>
    </div>
  `;
}

// Toggle Wishlist
async function toggleWishlist(event, variantId) {
  event.stopPropagation();
  event.preventDefault();

  const button = event.currentTarget;
  const icon = button.querySelector('i');
  button.disabled = true;

  try {
    const response = await axios.post('/wishlist/toggle', { variantId });
    const { data } = response;

    showToast(data.message, data.success ? 'success' : 'error');

    if (!data.success) return;

    if (data.action === 'added') {
      icon.classList.replace('fa-regular', 'fa-solid');
      button.classList.add('active');
    } else {
      icon.classList.replace('fa-solid', 'fa-regular');
      button.classList.remove('active');
    }

  } catch (error) {
    const message = error.response?.data?.message || 'Something went wrong!';
    showToast(message, 'error');

    if (message === 'please login') {
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
  } finally {
    button.disabled = false;
  }
}

// Add to Cart (placeholder - implement based on your cart logic)
async function addToCart(event, variantId) {
  event.stopPropagation();
  event.preventDefault();

  const button = event.currentTarget;
  button.disabled = true;

  try {
    const response = await axios.post('/cart/add', { 
      variantId,
      quantity: 1 
    });

    showToast(response.data.message, 'success');
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to add to cart';
    showToast(message, 'error');

    if (message === 'please login') {
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
  } finally {
    button.disabled = false;
  }
}

// Toast Notification
function showToast(message, type = 'success') {
  const toastStyles = {
    success: 'linear-gradient(135deg, #00C853, #009624)',
    info: 'linear-gradient(135deg, #2196F3, #1976D2)',
    error: 'linear-gradient(135deg, #E53935, #B71C1C)'
  };

  Toastify({
    text: message,
    duration: 1500,
    gravity: 'top',
    position: 'right',
    stopOnFocus: true,
    style: {
      background: toastStyles[type] || toastStyles.success,
      color: '#FFFFFF',
      fontWeight: '600',
      borderRadius: '8px',
      padding: '10px 16px',
      fontSize: '14px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    },
    offset: {
      x: 20,
      y: 70
    }
  }).showToast();
}