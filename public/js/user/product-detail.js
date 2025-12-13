function changeImage(src, e) {
  const main = document.getElementById("mainImage");
  main.src = src;
  document.querySelectorAll(".thumbnail").forEach(t => t.classList.remove("active"));
  e.target.classList.add("active");
}

document.addEventListener("DOMContentLoaded", function () {
  const variantBadges = document.querySelectorAll(".variant-badge");
  const priceSection = document.getElementById("priceSection");
  const stockInfo = document.getElementById("stockInfo");
  const addCartBtn = document.querySelector(".add-cart");
  const wishlistBtnIcon = document.querySelector(".wishlist-btn i");
  const productId = window.productId; // Set in EJS

  // Convert dataset values into number safely
  const num = (el, key) => Number(el.dataset[key]) || 0;


  /* -----------------------------------------------------
     WISHLIST HANDLERS
  ------------------------------------------------------ */

  // Toggle wishlist item
  window.toggleWishlist = async function (event, variantId) {
    event.stopPropagation();

    try {
      const res = await axios.post("/wishlist/toggle", { variantId });
      const data = res.data;

      if (!data.success) {
        showToast(data.message || "Login required", "error");
        return;
      }

      if (data.action === "added") {
        wishlistBtnIcon.classList.remove("far");
        wishlistBtnIcon.classList.add("fas");
        showToast("Added to Wishlist ❤️", "success");
      } else {
        wishlistBtnIcon.classList.remove("fas");
        wishlistBtnIcon.classList.add("far");
        showToast("Removed from Wishlist", "info");
      }

    } catch (error) {
      if (error.response?.status === 401) {
        showToast("Please login first", "error");
        return;
      }
      showToast("Something went wrong", "error");
    }
  };


  // Check wishlist status when switching variant
  async function updateWishlistIcon(variantId) {
    if (!wishlistBtnIcon) return;

    try {
      const res = await axios.get(`/wishlist/check/${productId}/${variantId}`);
      const { inWishlist } = res.data;

      wishlistBtnIcon.classList.toggle("fas", inWishlist);
      wishlistBtnIcon.classList.toggle("far", !inWishlist);

    } catch {
      // Logged out or error -> default outline
      wishlistBtnIcon.classList.remove("fas");
      wishlistBtnIcon.classList.add("far");
    }
  }


  /* -----------------------------------------------------
     PRICE & STOCK UPDATE
  ------------------------------------------------------ */

  function updatePrice() {
    const active = document.querySelector(".variant-badge.active");
    if (!active) return;

    const sale = num(active, "saleprice");
    const reg = num(active, "regularprice");
    const discount = num(active, "discount");

    const current = sale - discount;
    const hasDiscount = current < reg;
    const percent = hasDiscount
      ? Math.round(((reg - current) / reg) * 100)
      : 0;

    priceSection.innerHTML = `
      <span class="sale">₹${current.toLocaleString("en-IN")}</span>
      ${
        hasDiscount
          ? `<span class="regular">₹${reg.toLocaleString("en-IN")}</span>
             <span class="discount">${percent}% OFF</span>
             <p class="save-msg">Save ₹${(reg - current).toLocaleString("en-IN")}</p>`
          : ""
      }
    `;
  }

  function updateStock(stock) {
    if (stock <= 0) {
      stockInfo.innerHTML = `<div class="stock out-stock-msg"><i class="fa-solid fa-circle-exclamation"></i> Out of Stock</div>`;
      addCartBtn.disabled = true;
    } else if (stock < 20) {
      stockInfo.innerHTML = `<div class="stock low-stock-msg"><i class="fa-solid fa-clock"></i> Only ${stock} left!</div>`;
      addCartBtn.disabled = false;
    } else {
      stockInfo.innerHTML = `<div class="stock in-stock-msg"><i class="fa-solid fa-check-circle"></i> In Stock</div>`;
      addCartBtn.disabled = false;
    }
  }


  /* -----------------------------------------------------
     VARIANT CHANGE HANDLER
  ------------------------------------------------------ */

  variantBadges.forEach(badge => {
    badge.addEventListener("click", () => {
      variantBadges.forEach(b => b.classList.remove("active"));
      badge.classList.add("active");

      const variantId = badge.dataset.variantid;
      const stock = num(badge, "stock");

      addCartBtn.dataset.variantid = variantId;

      updatePrice();
      updateStock(stock);
      updateWishlistIcon(variantId);
    });
  });


  /* -----------------------------------------------------
     INITIAL LOAD SETUP
  ------------------------------------------------------ */

  const firstActive =
    document.querySelector(".variant-badge.active") ||
    document.querySelector(".variant-badge");

  if (firstActive) {
    firstActive.classList.add("active");
    addCartBtn.dataset.variantid = firstActive.dataset.variantid;
    updatePrice();
    updateStock(num(firstActive, "stock"));
    updateWishlistIcon(firstActive.dataset.variantid);
  }


  /* -----------------------------------------------------
     IMAGE ZOOM FEATURE
  ------------------------------------------------------ */

  const container = document.getElementById("imageContainer");
  const img = document.getElementById("mainImage");
  const lens = document.getElementById("zoomLens");

  function initZoom() {
    const zoomScale = 2.2;

    container.addEventListener("mouseenter", () => {
      lens.style.display = "block";
      img.style.transform = `scale(${zoomScale})`;
    });

    container.addEventListener("mouseleave", () => {
      lens.style.display = "none";
      img.style.transform = "scale(1)";
      img.style.transformOrigin = "center center";
    });

    container.addEventListener("mousemove", (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left - lens.offsetWidth / 2;
      const y = e.clientY - rect.top - lens.offsetHeight / 2;

      lens.style.left = `${Math.max(0, Math.min(x, rect.width - lens.offsetWidth))}px`;
      lens.style.top = `${Math.max(0, Math.min(y, rect.height - lens.offsetHeight))}px`;

      const originX = ((e.clientX - rect.left) / rect.width) * 100;
      const originY = ((e.clientY - rect.top) / rect.height) * 100;
      img.style.transformOrigin = `${originX}% ${originY}%`;
    });
  }

  img.onload = initZoom;
});

