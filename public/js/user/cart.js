// Debounce to prevent rapid requests
let updateTimeout = null;

function showToast(message, type = "success") {
  Toastify({
    text: message,
    duration: 3000,
    gravity: "top",
    position: "right",
    close: true,
    stopOnFocus: true,
    style: {
      background: type === "success" ? "#28a745" :
                  type === "warning" ? "#ffc107" :
                  type === "error"   ? "#dc3545" :
                  "#333",
      color: "#fff",
      fontSize: "14px",
      borderRadius: "6px",
      padding: "10px 15px",
    }
  }).showToast();
}

function changeQty(itemId, type) {
  const row = document.getElementById(`item-${itemId}`);
  if (!row) return;

  const qtyDisplay = row.querySelector(".qty-display");
  if (!qtyDisplay) return;

  const currentQty = parseInt(qtyDisplay.innerText);
  const newQty = type === "plus" ? currentQty + 1 : currentQty - 1;

  // Get stock from data attribute
  const plusBtn = row.querySelector(".qty-btn:last-child");
  const stockLimit = parseInt(plusBtn?.dataset.stock || 999);

  // Frontend validation - ONLY for minimum and maximum
  if (newQty < 1) {
    showToast("Minimum quantity is 1", "warning");
    return;
  }

  // Only block increase if it exceeds stock
  if (type === "plus" && newQty > stockLimit) {
    showToast(`Only ${stockLimit} items available`, "warning");
    return;
  }

  // Allow decrease even if current quantity > stock
  updateQty(itemId, newQty);
}

async function updateQty(itemId, newQty) {
  // Clear any pending update
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }

  // Debounce rapid clicks
  updateTimeout = setTimeout(async () => {
    const row = document.getElementById(`item-${itemId}`);
    if (!row) return;

    const qtyDisplay = row.querySelector(".qty-display");
    const priceBox = row.querySelector(".price-box");
    const buttons = row.querySelectorAll(".qty-btn");
    
    if (!qtyDisplay || !priceBox || buttons.length < 2) return;

    const minusBtn = buttons[0];
    const plusBtn = buttons[1];

    // Disable buttons during request
    minusBtn.disabled = true;
    plusBtn.disabled = true;

    try {
      const res = await axios.patch(`/cart/update/${itemId}`, { quantity: newQty });
      
      if (!res.data.success) {
        showToast(res.data.message, "warning");
        // Re-enable buttons even on failure
        minusBtn.disabled = false;
        plusBtn.disabled = false;
        return;
      }

      const { updatedItem, totals } = res.data;

      // Update quantity display
      qtyDisplay.innerText = updatedItem.quantity;

      // Store stock in button for validation
      plusBtn.dataset.stock = updatedItem.stock;

      // Handle out of stock
      if (updatedItem.outOfStock || updatedItem.stock === 0) {
        handleOutOfStock(row, itemId);
        showToast("Item is now out of stock", "warning");
        disableCheckout("out-of-stock");
      } else {
      // Update price UI SAME as product card logic
const regular = updatedItem.regularPrice;
const sale = updatedItem.salePrice;
const offerAmount = updatedItem.discountAmount || 0;
const current = sale - offerAmount;

const hasDiscount = regular > current;
const discountPercent = hasDiscount
  ? Math.round(((regular - current) / regular) * 100)
  : 0;

priceBox.innerHTML = `
  <div class="price" style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;">

    <div style="display:flex;align-items:center;gap:8px;">
      <span class="sale" style="font-size:18px;font-weight:700;color:#111;">
        ₹${(current * updatedItem.quantity).toLocaleString('en-IN')}
      </span>

      ${hasDiscount ? `
      <del class="regular"
        style="font-size:14px;color:#888;text-decoration:line-through;">
        ₹${(regular * updatedItem.quantity).toLocaleString('en-IN')}
      </del>` : ""}
    </div>

    ${hasDiscount ? `
    <span class="offer-badge"
      style="background:#16a34a;color:#fff;font-size:11px;
      padding:2px 6px;border-radius:4px;font-weight:600;">
      ${discountPercent}% OFF
    </span>` : ""}

    ${offerAmount > 0 ? `
    <span style="color:#16a34a;font-size:12px;font-weight:600;">
      Save ₹${((regular - current) * updatedItem.quantity).toLocaleString('en-IN')} with offers
    </span>` : ""}

  </div>
`;

        // Update button states
        minusBtn.classList.toggle("disabled", updatedItem.quantity <= 1);
        minusBtn.disabled = updatedItem.quantity <= 1;
        
        plusBtn.classList.toggle("disabled", updatedItem.quantity >= updatedItem.stock);
        plusBtn.disabled = updatedItem.quantity >= updatedItem.stock;

        // Update or remove stock warning message
        updateStockWarning(row, updatedItem.quantity, updatedItem.stock);

        // Check if quantity matches stock now
        checkAndUpdateCheckoutButton();
      }

      // Update cart summary
      updateSummary(totals);

    } catch (err) {
      console.error("Update quantity error:", err);
      
      if (err.response?.data?.message) {
        showToast(err.response.data.message, "error");
      } else if (err.message === "Network Error") {
        showToast("Connection error. Please try again.", "error");
      } else {
        showToast("Failed to update quantity", "error");
      }
    } finally {
      // Re-enable buttons
      minusBtn.disabled = false;
      plusBtn.disabled = false;
    }
  }, 300);
}

function handleOutOfStock(row, itemId) {
  const qtyBox = row.querySelector(".qty-box");
  const priceBox = row.querySelector(".price-box");
  const deleteBtn = row.querySelector(".delete-btn");

  if (qtyBox) qtyBox.style.display = "none";
  
  if (priceBox) {
    priceBox.innerHTML = `<p class="out-of-stock" style="color:#d9534f;font-weight:600;">Out of Stock</p>`;
  }

  if (deleteBtn) {
    deleteBtn.outerHTML = `<button class="remove-btn" onclick="removeItem('${itemId}')">Remove</button>`;
  }
}

function updateStockWarning(row, quantity, stock) {
  const details = row.querySelector(".cart-item-details");
  if (!details) return;

  // Remove existing warning
  const existingWarning = details.querySelector(".stock-warning");
  if (existingWarning) {
    existingWarning.remove();
  }

  // Add warning if quantity > stock
  if (quantity > stock) {
    const qtyBox = details.querySelector(".qty-box");
    if (qtyBox) {
      qtyBox.insertAdjacentHTML(
        "afterend",
        `<p class="stock-warning" style="color:#d9534f;font-size:12px;margin-top:5px;font-weight:600;">
          Only ${stock} available - Please decrease quantity
        </p>`
      );
    }
  } else if (stock <= 5) {
    // Show low stock warning
    const qtyBox = details.querySelector(".qty-box");
    if (qtyBox) {
      qtyBox.insertAdjacentHTML(
        "afterend",
        `<p class="stock-warning" style="color:#ff9800;font-size:12px;margin-top:5px;">
          Only ${stock} left in stock
        </p>`
      );
    }
  }
}

function disableCheckout(reason) {
  const checkoutBtn = document.querySelector(".checkout-btn");
  const summaryBox = document.querySelector(".summary-box");
  const existingMessage = summaryBox?.querySelector(".remove-message");
  
  if (checkoutBtn) {
    checkoutBtn.remove();
  }

  if (summaryBox && !existingMessage) {
    const message = reason === "out-of-stock" 
      ? "Remove out of stock items to checkout"
      : "Adjust quantities to available stock to checkout";

    summaryBox.insertAdjacentHTML(
      "beforeend",
      `<div class="remove-message" style="color:#d9534f;text-align:center;margin-top:15px;font-weight:600;">${message}</div>`
    );
  }
}

function enableCheckout() {
  const summaryBox = document.querySelector(".summary-box");
  const removeMessage = summaryBox?.querySelector(".remove-message");
  
  if (removeMessage) {
    removeMessage.remove();
  }

  // Check if we need to add checkout button back
  if (summaryBox && !summaryBox.querySelector(".checkout-btn")) {
    summaryBox.insertAdjacentHTML(
      "beforeend",
      `<a href="/checkout" class="checkout-btn">Proceed to Checkout</a>`
    );
  }
}

function checkAndUpdateCheckoutButton() {
  const cartItems = document.querySelectorAll(".cart-item");
  let hasOutOfStock = false;
  let hasInsufficientStock = false;

  cartItems.forEach(item => {
    // Check for out of stock
    if (item.querySelector(".out-of-stock")) {
      hasOutOfStock = true;
    }

    // Check for insufficient stock
    const qtyDisplay = item.querySelector(".qty-display");
    const plusBtn = item.querySelector(".qty-btn:last-child");
    
    if (qtyDisplay && plusBtn) {
      const quantity = parseInt(qtyDisplay.innerText);
      const stock = parseInt(plusBtn.dataset.stock);
      
      if (quantity > stock) {
        hasInsufficientStock = true;
      }
    }
  });

  if (hasOutOfStock) {
    disableCheckout("out-of-stock");
  } else if (hasInsufficientStock) {
    disableCheckout("insufficient-stock");
  } else {
    enableCheckout();
  }
}

async function removeItem(itemId) {
  if (!confirm("Remove this item from cart?")) return;

  try {
    const res = await axios.delete(`/cart/delete/${itemId}`);

    if (!res.data.success) {
      showToast(res.data.message, "error");
      return;
    }

    // Remove from DOM
    const itemElement = document.getElementById(`item-${itemId}`);
    if (itemElement) {
      itemElement.remove();
    }

    // Update summary
    const { totals, hasOutOfStock, hasInsufficientStock } = res.data;
    updateSummary(totals);

    showToast("Item removed from cart", "success");

    // Check if cart is empty
    const remaining = document.querySelectorAll(".cart-item").length;
    if (remaining === 0) {
      const cartBox = document.querySelector(".cart-items-box");
      const checkoutBtn = document.querySelector(".checkout-btn");
      const removeMessage = document.querySelector(".remove-message");
      
      if (cartBox) {
        cartBox.innerHTML = `<h2 class="empty-cart">Your Cart is Empty</h2>`;
      }
      
      if (checkoutBtn) checkoutBtn.remove();
      if (removeMessage) removeMessage.remove();
    } else {
      // Update checkout button status
      if (!hasOutOfStock && !hasInsufficientStock) {
        enableCheckout();
      } else if (hasOutOfStock) {
        disableCheckout("out-of-stock");
      } else if (hasInsufficientStock) {
        disableCheckout("insufficient-stock");
      }
    }

  } catch (err) {
    console.error("Remove item error:", err);
    
    if (err.response?.data?.message) {
      showToast(err.response.data.message, "error");
    } else {
      showToast("Failed to remove item", "error");
    }
  }
}

function updateSummary(totals) {
  const subtotalEl = document.getElementById("summary-subtotal");
  const discountEl = document.getElementById("summary-discount");
  const taxEl = document.getElementById("summary-tax");
  const totalEl = document.getElementById("summary-total");

  if (subtotalEl) subtotalEl.innerText = `₹${totals.subtotal.toLocaleString("en-IN")}`;
  if (discountEl) discountEl.innerText = `-₹${totals.discount.toLocaleString("en-IN")}`;
  if (taxEl) taxEl.innerText = `₹${totals.tax.toLocaleString("en-IN")}`;
  if (totalEl) totalEl.innerText = `₹${totals.total.toLocaleString("en-IN")}`;
}