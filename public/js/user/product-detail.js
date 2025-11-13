function changeImage(src, e) {
  const main = document.getElementById("mainImage");
  main.src = src;
  document.querySelectorAll(".thumbnail").forEach(t => t.classList.remove("active"));
  e.target.classList.add("active");
}
function increaseQty(max) {
  const input = document.getElementById("quantityInput");
  let val = parseInt(input.value, 10) || 1;
  if (val < max) {
    input.value = val + 1;
    updatePriceAndOffer();
  }
}
function decreaseQty() {
  const input = document.getElementById("quantityInput");
  let val = parseInt(input.value, 10) || 1;
  if (val > 1) {
    input.value = val - 1;
    updatePriceAndOffer();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const variantBadges = document.querySelectorAll(".variant-badge");
  const priceSection = document.getElementById("priceSection");
  const stockInfo = document.getElementById("stockInfo");
  const qtyInput = document.getElementById("quantityInput");
  const addCartBtn = document.querySelector(".add-cart");

 
  function parseDataNum(el, key) {
    return Number(el.dataset[key]);
  }

  window.updatePriceAndOffer = function updatePriceAndOffer() {
    const active = document.querySelector(".variant-badge.active");
    if (!active) {
      const first = document.querySelector(".variant-badge");
      if (first) first.classList.add("active");
      if (!document.querySelector(".variant-badge.active")) return;
    }
    const activeVariant = document.querySelector(".variant-badge.active");
    const salePrice = parseDataNum(activeVariant, "saleprice");
    const regularPrice = parseDataNum(activeVariant, "regularprice");
    const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);

    if (isNaN(salePrice) || isNaN(regularPrice)) {
      console.warn("Variant price missing or not numeric:", {
        salePrice: activeVariant.dataset.saleprice,
        regularPrice: activeVariant.dataset.regularprice,
        dataset: activeVariant.dataset
      });
      priceSection.innerHTML = `<span class="sale">Price not available</span>`;
      return;
    }

    const totalSale = salePrice * qty;
    const totalRegular = regularPrice * qty;
    const discountPercent = regularPrice > salePrice
      ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
      : 0;

    priceSection.innerHTML = `
      <span class="sale">₹${totalSale.toLocaleString()}</span>
      ${
        salePrice < regularPrice
          ? `<span class="regular">₹${totalRegular.toLocaleString()}</span>
             <span class="discount">${discountPercent}% OFF</span>`
          : ""
      }
    `;
  };

  if (variantBadges.length > 0) {
    variantBadges.forEach(badge => {
      badge.addEventListener("click", () => {
        variantBadges.forEach(b => b.classList.remove("active"));
        badge.classList.add("active");

        const stock = Number(badge.dataset.stock) || 0;
        qtyInput.value = 1;
        qtyInput.max = stock;
        if (addCartBtn) addCartBtn.dataset.variantid = badge.dataset.variantid;

        updatePriceAndOffer();
        if (stock <= 0) {
          stockInfo.innerHTML = `<div class="stock"><span class="out-stock">Out of Stock</span></div>`;
          if (addCartBtn) addCartBtn.disabled = true;
        } else if (stock < 20) {
          stockInfo.innerHTML = `<div class="stock"><span class="in-stock">Only ${stock} left!</span></div>`;
          if (addCartBtn) addCartBtn.disabled = false;
        } else {
          stockInfo.innerHTML = `<div class="stock"><span class="in-stock">In Stock</span></div>`;
          if (addCartBtn) addCartBtn.disabled = false;
        }
      });
    });
  }

  if (qtyInput) {
    qtyInput.addEventListener("input", () => {
      const max = Number(qtyInput.max) || Infinity;
      if (qtyInput.value === "" || Number(qtyInput.value) < 1) qtyInput.value = 1;
      if (Number(qtyInput.value) > max) qtyInput.value = max;
      updatePriceAndOffer();
    });
  }
  
  const firstActive = document.querySelector(".variant-badge.active") || document.querySelector(".variant-badge");
  if (firstActive) {
    if (!firstActive.classList.contains("active")) firstActive.classList.add("active");
    if (addCartBtn) addCartBtn.dataset.variantid = firstActive.dataset.variantid;
    qtyInput.max = Number(firstActive.dataset.stock) || qtyInput.max;
    updatePriceAndOffer();
  }
  // 🔍 Zoom feature
  const container = document.getElementById("imageContainer");
  const img = document.getElementById("mainImage");
  const lens = document.getElementById("zoomLens");
  const zoomScale = 2.2;

  if (!container || !img) return;

  function getDisplayRect() {
    const boxRect = container.getBoundingClientRect();
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const boxRatio = boxRect.width / boxRect.height;

    let displayWidth, displayHeight;
    if (imgRatio > boxRatio) {
      displayWidth = boxRect.width;
      displayHeight = boxRect.width / imgRatio;
    } else {
      displayHeight = boxRect.height;
      displayWidth = boxRect.height * imgRatio;
    }

    const offsetX = (boxRect.width - displayWidth) / 2;
    const offsetY = (boxRect.height - displayHeight) / 2;

    return { displayWidth, displayHeight, offsetX, offsetY, boxRect };
  }

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
    const { displayWidth, displayHeight, offsetX, offsetY, boxRect } = getDisplayRect();
    const lensW = lens.offsetWidth;
    const lensH = lens.offsetHeight;

    let mouseX = e.clientX - boxRect.left - offsetX;
    let mouseY = e.clientY - boxRect.top - offsetY;

    mouseX = Math.max(0, Math.min(mouseX, displayWidth));
    mouseY = Math.max(0, Math.min(mouseY, displayHeight));

    const lensX = offsetX + mouseX - lensW / 2;
    const lensY = offsetY + mouseY - lensH / 2;

    lens.style.left = `${Math.max(offsetX, Math.min(lensX, offsetX + displayWidth - lensW))}px`;
    lens.style.top = `${Math.max(offsetY, Math.min(lensY, offsetY + displayHeight - lensH))}px`;

    const originX = (mouseX / displayWidth) * 100;
    const originY = (mouseY / displayHeight) * 100;
    img.style.transformOrigin = `${originX}% ${originY}%`;
  });
});


