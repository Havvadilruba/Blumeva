let searchTimeout;
let currentOfferType = 'product';
let selectedProducts = []; // Array to store selected products

// ==============================
// MODAL MANAGEMENT
// ==============================
function openAddOfferModal() {
  const modal = document.getElementById('offerModal');
  const form = document.getElementById('offerForm');
  const modalTitle = document.getElementById('modalTitle');
  const submitBtnText = document.getElementById('submitBtnText');
  
  form.reset();
  document.getElementById('offerId').value = '';
  clearAllProducts();
  
  document.getElementById('productSelectionSection').style.display = 'none';
  document.getElementById('categorySelectionSection').style.display = 'none';
  
  modalTitle.textContent = 'Add New Offer';
  submitBtnText.textContent = 'Create Offer';
  
  modal.classList.add('show');
  
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('startDate').min = today;
  document.getElementById('endDate').min = today;
}

function closeOfferModal() {
  const modal = document.getElementById('offerModal');
  modal.classList.remove('show');
  
  document.getElementById('productSearchResults').innerHTML = '';
  document.getElementById('productSearchResults').classList.remove('show');
}

window.onclick = function(event) {
  const modal = document.getElementById('offerModal');
  if (event.target === modal) {
    closeOfferModal();
  }
}

document.addEventListener('click', function(event) {
  const searchWrapper = document.querySelector('.search-select-wrapper');
  const resultsDiv = document.getElementById('productSearchResults');
  
  if (searchWrapper && resultsDiv && !searchWrapper.contains(event.target)) {
    resultsDiv.classList.remove('show');
  }
});

// ==============================
// DISCOUNT TYPE HANDLER
// ==============================
function handleDiscountTypeChange() {
  const discountType = document.getElementById('discountType').value;
  const discountValue = document.getElementById('discountValue');
  const discountSuffix = document.getElementById('discountSuffix');
  const discountHelp = document.getElementById('discountHelp');
  
  if (discountType === 'percentage') {
    discountSuffix.textContent = '%';
    discountHelp.textContent = 'Enter discount percentage (1-90%)';
    discountValue.placeholder = 'e.g., 20';
    discountValue.max = '90';
    discountValue.min = '1';
  } else if (discountType === 'fixed') {
    discountSuffix.textContent = '₹';
    discountHelp.textContent = 'Enter fixed discount amount';
    discountValue.placeholder = 'e.g., 500';
    discountValue.removeAttribute('max');
    discountValue.min = '1';
  }
  
  discountValue.value = '';
}

// ==============================
// OFFER TYPE HANDLER
// ==============================
function handleOfferTypeChange() {
  const offerType = document.getElementById('offerTypeSelect').value;
  const productSection = document.getElementById('productSelectionSection');
  const categorySection = document.getElementById('categorySelectionSection');
  const productIDs = document.getElementById('productIDs');
  const categoryID = document.getElementById('categoryID');
  
  if (offerType === 'product') {
    productSection.style.display = 'block';
    categorySection.style.display = 'none';
    productIDs.required = true;
    categoryID.required = false;
    categoryID.value = '';
    currentOfferType = 'product';
  } else if (offerType === 'category') {
    productSection.style.display = 'none';
    categorySection.style.display = 'block';
    productIDs.required = false;
    categoryID.required = true;
    clearAllProducts();
    currentOfferType = 'category';
  } else {
    productSection.style.display = 'none';
    categorySection.style.display = 'none';
    productIDs.required = false;
    categoryID.required = false;
  }
}

// ==============================
// PRODUCT SEARCH - UPDATED ROUTE
// ==============================
function searchProducts(query) {
  clearTimeout(searchTimeout);
  
  const resultsDiv = document.getElementById('productSearchResults');
  
  if (!query || query.trim().length < 2) {
    resultsDiv.classList.remove('show');
    resultsDiv.innerHTML = '';
    return;
  }
  
  resultsDiv.innerHTML = '<div class="no-results">Searching...</div>';
  resultsDiv.classList.add('show');
  
  searchTimeout = setTimeout(async () => {
    try {
      console.log('Searching for:', query); // Debug
      
      // UPDATED ROUTE - Changed from /admin/offers/search-products to /admin/products/search
      const response = await axios.get('/admin/products/search', {
        params: { q: query.trim() }
      });
      
      console.log('Full response:', response); // Debug
      console.log('Response data:', response.data); // Debug
      
      if (response.data.success) {
        if (response.data.products && response.data.products.length > 0) {
          console.log('Products found:', response.data.products); // Debug
          displayProductResults(response.data.products);
        } else {
          console.log('No products in response'); // Debug
          resultsDiv.innerHTML = '<div class="no-results">No products found</div>';
          resultsDiv.classList.add('show');
        }
      } else {
        console.log('Response not successful'); // Debug
        resultsDiv.innerHTML = '<div class="no-results">No products found</div>';
        resultsDiv.classList.add('show');
      }
    } catch (error) {
      console.error('Product search error:', error);
      console.error('Error response:', error.response); // Debug
      resultsDiv.innerHTML = '<div class="no-results">Error searching products. Please try again.</div>';
      resultsDiv.classList.add('show');
    }
  }, 300);
}

function displayProductResults(products) {
  const resultsDiv = document.getElementById('productSearchResults');
  
  console.log('Displaying products:', products); // Debug
  
  if (!products || products.length === 0) {
    resultsDiv.innerHTML = '<div class="no-results">No products found</div>';
    resultsDiv.classList.add('show');
    return;
  }
  
  // Store products globally for access in onclick
  window.searchResultProducts = products;
  
  const html = products.map((product, index) => {
    const isSelected = selectedProducts.some(p => p._id === product._id);
    const imageSrc = product.image || '/images/placeholder-product.png';
    
    console.log('Product image:', imageSrc); // Debug
    
    return `
  <div class="search-result-item ${isSelected ? 'selected' : ''}" 
        onclick='selectProductByIndex(${index})' 
        data-product-id="${product._id}">
    <div class="search-result-image">
      <img src="${imageSrc}" 
           alt="${product.name}" 
           onerror="this.src='/images/placeholder-product.png'">
    </div>

    <div class="search-result-info">
      <div class="search-result-name">${product.name}</div>

      <div class="search-result-meta">
        ${product.brand || 'Unknown Brand'} • ${product.category || 'No Category'}
      </div>
    </div>

    ${isSelected ? '<i class="bi bi-check-circle-fill" style="color: #16a34a; font-size: 20px;"></i>' : ''}
  </div>
`;

  }).join('');
  
  console.log('Setting HTML for results'); // Debug
  resultsDiv.innerHTML = html;
  resultsDiv.classList.add('show');
  console.log('Results displayed, show class added'); // Debug
}

function selectProductByIndex(index) {
  if (window.searchResultProducts && window.searchResultProducts[index]) {
    selectProduct(window.searchResultProducts[index]);
  }
}

function selectProduct(product) {
  const isAlreadySelected = selectedProducts.some(p => p._id === product._id);
  
  if (isAlreadySelected) {
    showToast('Product already selected', 'error');
    return;
  }
  
  selectedProducts.push(product);
  renderSelectedProducts();
  
  document.getElementById('productSearch').value = '';
  document.getElementById('productSearchResults').innerHTML = '';
  document.getElementById('productSearchResults').classList.remove('show');
  
  showToast('Product added successfully', 'success');
}

function renderSelectedProducts() {
  const container = document.getElementById('selectedProductsContainer');
  const listDiv = document.getElementById('selectedProductsList');
  const countSpan = document.querySelector('.selected-count');
  const hiddenInput = document.getElementById('productIDs');
  
  if (selectedProducts.length === 0) {
    container.style.display = 'none';
    hiddenInput.value = '';
    return;
  }
  
  container.style.display = 'block';
  countSpan.textContent = `${selectedProducts.length} product${selectedProducts.length !== 1 ? 's' : ''} selected`;
  hiddenInput.value = selectedProducts.map(p => p._id).join(',');
  
  const html = selectedProducts.map((product, index) => `
    <div class="selected-product-item">
      <div class="selected-product-info">
        <div class="selected-product-image">
          <img src="${product.image || '/images/placeholder-product.png'}" 
               alt="${product.name}" 
               onerror="this.src='/images/placeholder-product.png'">
        </div>
        <div class="selected-product-details">
          <div class="selected-product-name">${product.name}</div>
        </div>
      </div>
      <button type="button" class="btn-remove-product" onclick="removeProduct(${index})" title="Remove">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
  `).join('');
  
  listDiv.innerHTML = html;
}

function removeProduct(index) {
  selectedProducts.splice(index, 1);
  renderSelectedProducts();
  showToast('Product removed', 'info');
}

function clearAllProducts() {
  selectedProducts = [];
  renderSelectedProducts();
  document.getElementById('productSearch').value = '';
  document.getElementById('productSearchResults').innerHTML = '';
  document.getElementById('productSearchResults').classList.remove('show');
}

// ==============================
// FORM SUBMISSION
// ==============================
document.getElementById('offerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const offerId = document.getElementById('offerId').value;
  const offerType = document.getElementById('offerTypeSelect').value;
  const productIDs = document.getElementById('productIDs').value;
  const categoryID = document.getElementById('categoryID').value;
  const offerName = document.getElementById('offerName').value.trim();
  const discountType = document.getElementById('discountType').value;
  const discountValue = parseInt(document.getElementById('discountValue').value);
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const isActive = document.getElementById('isActive').value === 'true';
  
  
  const offerData = {
    offerType,
    offerName,
    discountType,
    discountValue,
    startDate,
    endDate,
    isActive
  };
  
  if (offerType === 'product') {
    offerData.productID = productIDs.split(',').filter(id => id.trim());
  } else {
    offerData.categoryID = categoryID;
  }
  
  try {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';
    
    let response;
    if (offerId) {
      response = await axios.put(`/admin/offers/${offerId}`, offerData);
    } else {
      response = await axios.post('/admin/offers', offerData);
    }
    
    if (response.data.success) {
      showToast(response.data.message, 'success');
      closeOfferModal();
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  } catch (error) {
    console.error('Offer save error:', error);
    showToast(error.response?.data?.message || 'Failed to save offer', 'error');
  } finally {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> <span id="submitBtnText">Save Offer</span>';
  }
});

// ==============================
// EDIT OFFER
// ==============================
async function editOffer(offerId) {
  try {
    const response = await axios.get(`/admin/offers/${offerId}`);
    
    if (response.data.success) {
      const offer = response.data.offer;
      
      const modal = document.getElementById('offerModal');
      modal.classList.add('show');
      
      document.getElementById('modalTitle').textContent = 'Edit Offer';
      document.getElementById('submitBtnText').textContent = 'Update Offer';
      
      document.getElementById('offerId').value = offer._id;
      document.getElementById('offerTypeSelect').value = offer.offerType;
      document.getElementById('offerName').value = offer.offerName;
      document.getElementById('discountType').value = offer.discountType;
      handleDiscountTypeChange();
      document.getElementById('discountValue').value = offer.discountValue;
      document.getElementById('startDate').value = new Date(offer.startDate).toISOString().split('T')[0];
      document.getElementById('endDate').value = new Date(offer.endDate).toISOString().split('T')[0];
      document.getElementById('isActive').value = offer.isActive.toString();
      
      handleOfferTypeChange();
      
      if (offer.offerType === 'product' && offer.productID) {
        if (!Array.isArray(offer.productID)) {
          offer.productID = [offer.productID];
        }
        
        selectedProducts = offer.productID.map(p => ({
          _id: p._id,
          name: p.name,
          image: p.images?.[0] || null,
        }));
        
        renderSelectedProducts();
      } else if (offer.offerType === 'category' && offer.categoryID) {
        document.getElementById('categoryID').value = offer.categoryID._id;
      }
    }
  } catch (error) {
    console.error('Edit offer error:', error);
    showToast('Failed to load offer details', 'error');
  }
}

// ==============================
// TOGGLE & DELETE
// ==============================
async function toggleOfferStatus(offerId, currentStatus) {
  const action = currentStatus ? 'deactivate' : 'activate';
  
  if (!confirm(`Are you sure you want to ${action} this offer?`)) return;
  
  try {
    const response = await axios.patch(`/admin/offers/${offerId}/toggle-status`);
    
    if (response.data.success) {
      showToast(response.data.message, 'success');
      setTimeout(() => window.location.reload(), 1000);
    }
  } catch (error) {
    console.error('Toggle status error:', error);
    showToast(error.response?.data?.message || 'Failed to update status', 'error');
  }
}

async function deleteOffer(offerId) {
  if (!confirm('Are you sure you want to delete this offer? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await axios.delete(`/admin/offers/${offerId}`);
    
    if (response.data.success) {
      showToast(response.data.message, 'success');
      setTimeout(() => window.location.reload(), 1000);
    }
  } catch (error) {
    console.error('Delete offer error:', error);
    showToast(error.response?.data?.message || 'Failed to delete offer', 'error');
  }
}

// ==============================
// FILTERS & PAGINATION
// ==============================
function switchTab(type) {
  const url = new URL(window.location.href);
  url.searchParams.set('type', type);
  window.location.href = url.toString();
}
function handleSearch() {
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearBtn");

  clearBtn.style.display = searchInput.value.length > 0 ? "block" : "none";

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    applyFilters();
  }, 500); // Debounce search
}

document.getElementById("searchInput").addEventListener("keypress", function(e) {
  if (e.key === "Enter") applyFilters();
});

// Clear search button action
function clearSearch() {
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearBtn');
  
  searchInput.value = '';
  clearBtn.style.display = 'none';
  applyFilters();
}

// Apply filters & reload only manually
function applyFilters() {
  const url = new URL(window.location.href);
  const searchQuery = document.getElementById('searchInput').value.trim();
  const statusFilter = document.getElementById('statusFilter').value;
  const sortFilter = document.getElementById('sortFilter').value;
  
  if (searchQuery) url.searchParams.set('search', searchQuery);
  else url.searchParams.delete('search');

  if (statusFilter) url.searchParams.set('status', statusFilter);
  else url.searchParams.delete('status');

  if (sortFilter && sortFilter !== 'recent') url.searchParams.set('sort', sortFilter);
  else url.searchParams.delete('sort');

  url.searchParams.set('page', '1');
  window.location.href = url.toString();
}

function changePage(page) {
  const url = new URL(window.location.href);
  url.searchParams.set('page', page);
  window.location.href = url.toString();
}
// ==============================
// PAGE LOAD
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearBtn");
  clearBtn.style.display = searchInput.value.length > 0 ? "block" : "none";
});

// ==============================
// UTILITIES
// ==============================
function showToast(message, type = 'success') {
  let bgColor;
  
  switch(type) {
    case 'success':
      bgColor = 'linear-gradient(to right, #00b09b, #96c93d)';
      break;
    case 'error':
      bgColor = 'linear-gradient(to right, #ff5f6d, #ffc371)';
      break;
    case 'info':
      bgColor = 'linear-gradient(to right, #2196F3, #00BCD4)';
      break;
    default:
      bgColor = 'linear-gradient(to right, #00b09b, #96c93d)';
  }
  
  Toastify({
    text: message,
    duration: 3000,
    gravity: 'top',
    position: 'right',
    style: {
      background: bgColor,
    },
    stopOnFocus: true
  }).showToast();
}

document.getElementById('startDate')?.addEventListener('change', function() {
  const startDate = this.value;
  document.getElementById('endDate').min = startDate;
  
  const endDate = document.getElementById('endDate').value;
  if (endDate && endDate <= startDate) {
    document.getElementById('endDate').value = '';
  }
});

document.addEventListener('DOMContentLoaded', function() {
  const today = new Date().toISOString().split('T')[0];
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  
  if (startDateInput) startDateInput.min = today;
  if (endDateInput) endDateInput.min = today;
});