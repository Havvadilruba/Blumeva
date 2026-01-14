// Navigate to product details page
function goToProduct(productId) {
  window.location.href = `/product/${productId}`;
}

// Search functionality with debounce
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-input");
  const clearButton = document.getElementById("clear-search");

  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const url = new URL(window.location);
        const q = searchInput.value.trim();

        if (q) {
          url.searchParams.set("q", q);
        } else {
          url.searchParams.delete("q");
        }

        url.searchParams.set("page", 1);
        window.location.href = url.href;
      }, 400);
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      const url = new URL(window.location.origin + window.location.pathname);
      window.location.href = url.href;
    });
  }
});

// Brand filter with double-click to unselect
function brandFilter(element) {
  const brandValue = element.getAttribute('data-value');
  const input = element.querySelector('input[type="radio"]');
  const url = new URL(window.location);
  
  // Check if this brand is already selected
  const currentBrand = url.searchParams.get('brand');
  
  if (currentBrand === brandValue && input.checked) {
    // Double-click: unselect
    input.checked = false;
    url.searchParams.delete('brand');
  } else {
    // First click: select
    url.searchParams.set('brand', brandValue);
  }
  
  url.searchParams.set('page', 1);
  window.location.href = url.href;
}

// Category filter with double-click to unselect
function categoryFilter(element) {
  const categoryValue = element.getAttribute('data-value');
  const input = element.querySelector('input[type="radio"]');
  const url = new URL(window.location);
  
  // Check if this category is already selected
  const currentCategory = url.searchParams.get('category');
  
  if (currentCategory === categoryValue && input.checked) {
    // Double-click: unselect
    input.checked = false;
    url.searchParams.delete('category');
  } else {
    // First click: select
    url.searchParams.set('category', categoryValue);
  }
  
  url.searchParams.set('page', 1);
  window.location.href = url.href;
}

// Rating filter with double-click to unselect
function ratingFilter(element) {
  const ratingValue = element.getAttribute('data-value');
  const input = element.querySelector('input[type="radio"]');
  const url = new URL(window.location);
  
  // Check if this rating is already selected
  const currentRating = url.searchParams.get('rating');
  
  if (currentRating === ratingValue && input.checked) {
    // Double-click: unselect
    input.checked = false;
    url.searchParams.delete('rating');
  } else {
    // First click: select
    url.searchParams.set('rating', ratingValue);
  }
  
  url.searchParams.set('page', 1);
  window.location.href = url.href;
}

// Apply filters (sort and price)
function applyFilter() {
  const sortBy = document.getElementById('sort-by')?.value || '';
  const minPrice = document.getElementById('price-from')?.value || '';
  const maxPrice = document.getElementById('price-to')?.value || '';
  const url = new URL(window.location);

  // Sort filter
  if (sortBy) {
    url.searchParams.set('sort', sortBy);
  } else {
    url.searchParams.delete('sort');
  }

  // Price filters
  if (minPrice) {
    url.searchParams.set('priceMin', minPrice);
  } else {
    url.searchParams.delete('priceMin');
  }

  if (maxPrice) {
    url.searchParams.set('priceMax', maxPrice);
  } else {
    url.searchParams.delete('priceMax');
  }

  url.searchParams.set('page', 1);
  window.location.href = url.href;
}

// Clear all filters
function clearFilters() {
  const url = new URL(window.location.origin + window.location.pathname);
  window.location.href = url.href;
}

// Change pagination page
function changePage(page) {
  const url = new URL(window.location);
  url.searchParams.set("page", page);
  window.location.href = url.href;
}

// Search products (alternative method)
// Search functionality with debounce
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-input");
  const clearButton = document.getElementById("clear-search");

  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const url = new URL(window.location);
        const q = searchInput.value.trim();

        if (q) {
          url.searchParams.set("q", q);
        } else {
          url.searchParams.delete("q");
        }

        url.searchParams.set("page", 1);
        window.location.href = url.href;
      }, 400);
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      const url = new URL(window.location);
      // Only delete the search query parameter
      url.searchParams.delete("q");
      url.searchParams.set("page", 1);
      window.location.href = url.href;
    });
  }
});