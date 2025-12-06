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

  // Convert dataset values to numbers safely
  function num(el, key) {
    return Number(el.dataset[key]) || 0;
  }

  // ✅ Update price & offer display (NOW WITH DISCOUNT)
  function updatePrice() {
    const active = document.querySelector(".variant-badge.active");
    if (!active) return;

    const salePrice = num(active, "saleprice");
    const regularPrice = num(active, "regularprice");
    const discount = num(active, "discount");

    const current = salePrice - discount;
    const hasDiscount = current < regularPrice;
    const discountPercent = hasDiscount
      ? Math.round(((regularPrice - current) / regularPrice) * 100)
      : 0;

    priceSection.innerHTML = `
      <span class="sale">₹${current.toLocaleString("en-IN")}</span>
      ${
        hasDiscount
          ? `<span class="regular">₹${regularPrice.toLocaleString("en-IN")}</span>
             <span class="discount">${discountPercent}% OFF</span>
             <p class="save-msg">Save ₹${(regularPrice - current).toLocaleString("en-IN")}</p>`
          : ""
      }
    `;
  }

  // Update stock display (same as yours)
  function updateStock(stock) {
    if (stock <= 0) {
      stockInfo.innerHTML = `<div class="stock out-stock-msg"><i class="fa-solid fa-circle-exclamation"></i> Out of Stock</div>`;
      if (addCartBtn) addCartBtn.disabled = true;
    } else if (stock < 20) {
      stockInfo.innerHTML = `<div class="stock low-stock-msg"><i class="fa-solid fa-clock"></i> Only ${stock} left!</div>`;
      if (addCartBtn) addCartBtn.disabled = false;
    } else {
      stockInfo.innerHTML = `<div class="stock in-stock-msg"><i class="fa-solid fa-check-circle"></i> In Stock</div>`;
      if (addCartBtn) addCartBtn.disabled = false;
    }
  }

  // Handle variant clicking (same as yours, with updatePrice using discount)
  variantBadges.forEach(badge => {
    badge.addEventListener("click", () => {
      variantBadges.forEach(b => b.classList.remove("active"));
      badge.classList.add("active");

      const stock = num(badge, "stock");

      if (addCartBtn) addCartBtn.dataset.variantid = badge.dataset.variantid;

      updatePrice();
      updateStock(stock);
    });
  });

  // Initialize first active variant
  const firstActive =
    document.querySelector(".variant-badge.active") ||
    document.querySelector(".variant-badge");

  if (firstActive) {
    firstActive.classList.add("active");
    if (addCartBtn) addCartBtn.dataset.variantid = firstActive.dataset.variantid;
    updatePrice();
    updateStock(num(firstActive, "stock"));
  }

  // ==== IMAGE ZOOM (exactly as you gave) ====
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

  img.onload = initZoom; // Wait until image fully loads
});
