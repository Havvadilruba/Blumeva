function changeImage(src, e) {
  const main = document.getElementById("mainImage");
  main.src = src;
  document.querySelectorAll(".thumbnail").forEach(t => t.classList.remove("active"));
  e.target.classList.add("active");
  
  // Reinitialize zoom for new image
  setTimeout(() => {
    initImageZoom();
  }, 100);
}

/* -----------------------------------------------------
   IMAGE ZOOM FUNCTIONALITY - INTERNAL ZOOM
------------------------------------------------------ */
let zoomActive = false;

function initImageZoom() {
  const imageContainer = document.getElementById("imageContainer");
  const mainImage = document.getElementById("mainImage");
  
  if (!imageContainer || !mainImage) return;

  let zoomLevel = 2; // Zoom magnification level

  imageContainer.addEventListener("mousemove", function(e) {
    if (!zoomActive) return;
    
    const rect = imageContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate percentage position
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    // Apply zoom transform
    mainImage.style.transformOrigin = `${xPercent}% ${yPercent}%`;
    mainImage.style.transform = `scale(${zoomLevel})`;
    mainImage.style.cursor = 'zoom-in';
  });

  imageContainer.addEventListener("mouseenter", function() {
    zoomActive = true;
    imageContainer.style.overflow = 'hidden';
  });

  imageContainer.addEventListener("mouseleave", function() {
    zoomActive = false;
    mainImage.style.transform = 'scale(1)';
    mainImage.style.transformOrigin = 'center center';
    mainImage.style.cursor = 'crosshair';
  });
}

document.addEventListener("DOMContentLoaded", function () {
  // Initialize image zoom
  const mainImage = document.getElementById("mainImage");
  if (mainImage) {
    mainImage.addEventListener("load", initImageZoom);
    if (mainImage.complete) initImageZoom();
  }

  /* -----------------------------------------------------
     VARIANT & CART FUNCTIONALITY
  ------------------------------------------------------ */
  const variantBadges = document.querySelectorAll(".variant-badge");
  const priceSection = document.getElementById("priceSection");
  const stockInfo = document.getElementById("stockInfo");
  const addCartBtn = document.querySelector(".add-cart");
  const wishlistBtn = document.querySelector(".wishlist-btn");
  const productId = window.productId;

  const num = (el, key) => Number(el.dataset[key]) || 0;

  /* -----------------------------------------------------
     OFFER CALCULATION
  ------------------------------------------------------ */
  function calculateOffer(salePrice) {
    let maxOffer = 0;

    const applyOffers = (offers) => {
      for (let offer of offers || []) {
        let amount = 0;
        if (offer.discountType === "percentage") {
          amount = salePrice * offer.discountValue * 0.01;
        } else if (offer.discountValue < salePrice * 0.9) {
          amount = offer.discountValue;
        }
        maxOffer = Math.max(maxOffer, amount);
      }
    };

    applyOffers(window.productOffers);
    applyOffers(window.categoryOffers);

    return Math.ceil(maxOffer);
  }

  /* -----------------------------------------------------
     TOGGLE WISHLIST
  ------------------------------------------------------ */
  window.toggleWishlist = async function (event) {
    event.preventDefault();
    event.stopPropagation();

    const btn = event.currentTarget;
    const icon = btn.querySelector("i");

    const activeVariant = document.querySelector(".variant-badge.active");
    if (!activeVariant) {
      showToast("Please select a variant", "error");
      return;
    }

    const variantId = activeVariant.dataset.variantid;
    btn.disabled = true;

    try {
      const res = await axios.post("/wishlist/toggle", { variantId });
      const data = res.data;

      if (!data.success) {
        showToast(data.message || "Login required", "error");
        return;
      }

      if (data.action === "added") {
        icon.classList.replace("fa-regular", "fa-solid");
        btn.classList.add("active");
        showToast("Added to Wishlist ❤️", "success");
      } else {
        icon.classList.replace("fa-solid", "fa-regular");
        btn.classList.remove("active");
        showToast("Removed from Wishlist", "success");
      }

    } catch (error) {
      if (error.response?.status === 401) {
        showToast("Please login first", "error");
      } else {
        showToast("Wishlist failed", "error");
      }
    } finally {
      btn.disabled = false;
    }
  };

  /* -----------------------------------------------------
     ADD TO CART
  ------------------------------------------------------ */
  window.addToCart = async function (event) {
    event.stopPropagation();
    event.preventDefault();

    const activeVariant = document.querySelector(".variant-badge.active");
    if (!activeVariant) {
      showToast("Please select a variant", "error");
      return;
    }

    const variantId = activeVariant.dataset.variantid;

    try {
      const res = await axios.post("/cart/add", { variantId, quantity: 1 });
      const data = res.data;

      if (data.success) {
        showToast("Added to Cart 🛒", "success");
        if (typeof updateCartCount === "function") updateCartCount();
      } else {
        showToast(data.message || "Failed to add to cart", "error");
      }

    } catch (error) {
      if (error.response && error.response.data?.message) {
    showToast(error.response.data.message, "error");
  } else if (error.message === "Network Error") {
    showToast("Network error. Please try again.", "error");
  } else {
    showToast("Unexpected error occurred", "error");
  }
    }
  };

  /* -----------------------------------------------------
     PRICE & STOCK
  ------------------------------------------------------ */
  function updatePrice() {
    const active = document.querySelector(".variant-badge.active");
    if (!active) return;

    const sale = num(active, "saleprice");
    const reg = num(active, "regularprice");
    const offer = calculateOffer(sale);

    const finalPrice = Math.max(0, sale - offer);
    const discount = reg - finalPrice;
    const percent = discount > 0 ? Math.round((discount / reg) * 100) : 0;

    priceSection.innerHTML = `
      <span class="sale">₹${finalPrice.toLocaleString("en-IN")}</span>
      ${
        discount > 0
          ? `<span class="regular">₹${reg.toLocaleString("en-IN")}</span>
             <span class="discount">${percent}% OFF</span>
             <p class="save-msg">Save ₹${discount.toLocaleString("en-IN")}</p>`
          : ""
      }
    `;
  }

  function updateStock(stock) {
    if (!addCartBtn) return;

    if (stock <= 0) {
      stockInfo.innerHTML = `<div class="stock out-stock-msg"><i class="fa-solid fa-circle-exclamation"></i> Out of Stock</div>`;
      addCartBtn.disabled = true;
      addCartBtn.textContent = "Out of Stock";
    } else {
      stockInfo.innerHTML =
        stock < 20
          ? `<div class="stock low-stock-msg"><i class="fa-solid fa-clock"></i> Only ${stock} left!</div>`
          : `<div class="stock in-stock-msg"><i class="fa-solid fa-check-circle"></i> In Stock</div>`;
      addCartBtn.disabled = false;
      addCartBtn.textContent = "Add to Cart";
    }
  }

  /* -----------------------------------------------------
     VARIANT CHANGE
  ------------------------------------------------------ */
  variantBadges.forEach(badge => {
    badge.addEventListener("click", () => {
      variantBadges.forEach(b => b.classList.remove("active"));
      badge.classList.add("active");

      updatePrice();
      updateStock(num(badge, "stock"));

      // Sync wishlist icon
      const isInWishlist = badge.dataset.inwishlist === "true";
      const icon = document.querySelector(".wishlist-btn i");
      const btn = document.querySelector(".wishlist-btn");

      if (isInWishlist) {
        icon.classList.replace("fa-regular", "fa-solid");
        btn.classList.add("active");
      } else {
        icon.classList.replace("fa-solid", "fa-regular");
        btn.classList.remove("active");
      }
    });
  });

  /* -----------------------------------------------------
     INITIAL LOAD
  ------------------------------------------------------ */
  const firstActive =
    document.querySelector(".variant-badge.active") ||
    document.querySelector(".variant-badge");

  if (firstActive) {
    firstActive.classList.add("active");
    updatePrice();
    updateStock(num(firstActive, "stock"));
    
    const variantId = firstActive.dataset.variantid;
    if (variantId && typeof updateWishlistIcon === "function") {
      updateWishlistIcon(variantId);
    }
  }
});