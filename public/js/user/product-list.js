function goToProduct(productId) {
  window.location.href = `/product/${productId}`;
}
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

        if (q) url.searchParams.set("q", q);
        else url.searchParams.delete("q");

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



function brandFilter(e){
  const brand = e.getAttribute('name') || '';
  const url = new URL(window.location);
  if (brand) url.searchParams.set('brand', brand);
  else url.searchParams.delete('brand');
  url.searchParams.set('page', 1);
  window.location = url.href;
}

function categoryFilter(e){
  const category = e.getAttribute('name') || '';
  const url = new URL(window.location);
  if (category) url.searchParams.set('category', category);
  else url.searchParams.delete('category');
  url.searchParams.set('page', 1);
  window.location = url.href;
}

function ratingFilter(e){
  const rating = e.getAttribute('name') || '';
  const url = new URL(window.location);
  if (rating) url.searchParams.set('rating', rating);
  else url.searchParams.delete('rating');
  url.searchParams.set('page', 1);
  window.location = url.href;
}

function applyFilter(){
  const sortBy = document.getElementById('sort-by').value || '';
  const minPrice = document.getElementById('price-from').value;
  const maxPrice = document.getElementById('price-to').value;
  const url = new URL(window.location);

  if (sortBy) url.searchParams.set('sort', sortBy);
  else url.searchParams.delete('sort');

  if (minPrice) url.searchParams.set('priceMin', minPrice);
  else url.searchParams.delete('priceMin');

  if (maxPrice) url.searchParams.set('priceMax', maxPrice);
  else url.searchParams.delete('priceMax');

  url.searchParams.set('page', 1);
  window.location = url.href;
}

function clearFilters(){
  const url = new URL(window.location.origin + window.location.pathname);
  window.location = url.href;
}

function changePage(page){
  const url = new URL(window.location);
  url.searchParams.set("page", page);
  window.location.href = url.href;
}

function searchProducts(){
  const q = document.getElementById('search-input').value || '';
  const url = new URL(window.location);
  if (q) url.searchParams.set('q', q);
  else url.searchParams.delete('q');
  url.searchParams.set('page', 1);
  window.location = url.href;
}




