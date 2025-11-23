function showToast(message, type = "success") {
  Toastify({
    text: message,
    duration: 3000,
    gravity: "top", // top or bottom
    position: "right", // left, center, right
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
  const currentQty = parseInt(row.querySelector(".qty-display").innerText);

  const newQty = type === "plus" ? currentQty + 1 : currentQty - 1;
  updateQty(itemId, newQty);
}



async function updateQty(itemId, newQty) {
  try {
    if (newQty < 1) return;

    const res = await axios.patch(`/cart/update/${itemId}`, { quantity: newQty });
if (!res.data.success) {
  showToast(res.data.message, "warning");
  return; 
}


    const { updatedItem, totals } = res.data;
    const row = document.getElementById(`item-${itemId}`);

    // Update quantity display
    row.querySelector(".qty-display").innerText = updatedItem.quantity;

    // Update price UI
    const priceBox = row.querySelector(".price-box");
    priceBox.innerHTML = `
      <h3 class="price">₹${(updatedItem.salePrice * updatedItem.quantity).toLocaleString("en-IN")}</h3>
      <del class="old-price">₹${(updatedItem.regularPrice * updatedItem.quantity).toLocaleString("en-IN")}</del>
    `;

    // Update + and - button states based on stock
   // Update + and - button states based on stock
const buttons = row.querySelectorAll(".qty-btn");
const minusBtn = buttons[0];
const plusBtn = buttons[1];

minusBtn.classList.toggle("disabled", updatedItem.quantity <= 1);
plusBtn.classList.toggle("disabled", updatedItem.quantity >= updatedItem.stock);

    // If out of stock
    if (updatedItem.outOfStock) {
      row.querySelector(".qty-box").style.display = "none";
      priceBox.innerHTML = `<p class="out-stock" style="color:#d9534f;font-weight:600;">Out of Stock</p>`;
      row.querySelector(".delete-btn").outerHTML =
        `<button class="remove-btn" onclick="removeItem('${itemId}')">Remove</button>`;

      document.querySelector(".checkout-btn")?.remove();
      document.querySelector(".summary-box").insertAdjacentHTML(
        "beforeend",
        `<div class="remove-message">Remove Out of Stock items to checkout</div>`
      );

      showToast("Item out of stock!", "warning");
    }

    // Update cart summary totals
   document.getElementById("summary-subtotal").innerText = `₹${totals.subtotal.toLocaleString("en-IN")}`;
document.getElementById("summary-discount").innerText = `-₹${totals.discount.toLocaleString("en-IN")}`;
document.getElementById("summary-tax").innerText = `₹${totals.tax.toLocaleString("en-IN")}`;
document.getElementById("summary-total").innerText = `₹${totals.total.toLocaleString("en-IN")}`;

  } catch (err) {
    console.error("Update quantity error:", err);
  }
}

async function removeItem(itemId) {
  try {
    const res = await axios.delete(`/cart/delete/${itemId}`);

    if (!res.data.success) {
      showToast(res.data.message, "error");
      return;
    }

    // Remove from DOM
    document.getElementById(`item-${itemId}`)?.remove();

    // Update summary
    const { totals } = res.data;
    document.getElementById("summary-subtotal").innerText = `₹${totals.subtotal.toLocaleString("en-IN")}`;
    document.getElementById("summary-discount").innerText = `-₹${totals.discount.toLocaleString("en-IN")}`;
    document.getElementById("summary-tax").innerText = `₹${totals.tax.toLocaleString("en-IN")}`;
    document.getElementById("summary-total").innerText = `₹${totals.total.toLocaleString("en-IN")}`;

    showToast("Item removed from cart", "success");

    // If cart empty, show empty message
   const remaining = document.querySelectorAll(".cart-item").length;

if (remaining === 0) {
  document.querySelector(".cart-items-box").innerHTML =
    `<h2 class="empty-cart">Your Cart is Empty</h2>`;
  document.querySelector(".checkout-btn")?.remove();
}

  } catch (err) {
    console.error("Remove item error:", err);
    showToast("Failed to remove item", "error");
  }
}

