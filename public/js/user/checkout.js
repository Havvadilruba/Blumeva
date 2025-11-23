
// Selected values
let selectedAddressId = null;
let selectedPaymentMethod = "online";

// Address select
document.querySelectorAll('input[name="selectedAddress"]').forEach(radio => {
  radio.addEventListener("change", function () {
    selectedAddressId = this.value;
  });
});

// Payment select
document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
  radio.addEventListener("change", function () {
    selectedPaymentMethod = this.value;
  });
});

// ---------------- APPLY COUPON ----------------
function applyCoupon() {
  const code = document.querySelector(".coupon-input").value.trim().toUpperCase();
  if (!code) return alert("Enter coupon");

  fetch("/api/cart/apply-coupon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ couponCode: code })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) location.reload();
      else alert(data.message);
    })
    .catch(() => alert("Coupon apply failed"));
}

// Remove coupon
function removeCoupon() {
  fetch("/api/cart/remove-coupon", {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) location.reload();
    });
}

// ---------------- PLACE ORDER ----------------
async function placeOrder() {
  const address = document.querySelector('input[name="selectedAddress"]:checked');
  if (!address) return alert("Please select delivery address");

  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

  const payload = { addressId: address.value, paymentMethod };

  const placeBtn = document.getElementById("placeOrderBtn");
  placeBtn.disabled = true;
  placeBtn.innerHTML = "Processing...";

  try {
    const response = await axios.post("/order/place", payload);
    if (response.data.success) {
      window.location.href = "/order/success/" + response.data.orderId;
    } else {
      alert(response.data.message);
      placeBtn.disabled = false;
      placeBtn.innerHTML = "Place Order";
    }
  } catch (err) {
    console.log(err);
    alert("Order failed");
    placeBtn.disabled = false;
    placeBtn.innerHTML = "Place Order";
  }
}

// Open Modal
function openModal() {
  document.getElementById("addressModal").style.display = "flex";
  document.getElementById("modalTitle").innerText = "Add Address";
  document.getElementById("addressForm").reset();
}

// Close Modal
function closeModal() {
  document.getElementById("addressModal").style.display = "none";
}

document.getElementById("saveBtn").addEventListener("click", async () => {
  console.log("Save button clicked");

  const payload = {
    addressType: document.getElementById("addressType").value,
    fullName: document.getElementById("fullName").value,
    phone: document.getElementById("phone").value,
    address1: document.getElementById("address1").value,
    address2: document.getElementById("address2").value,
    city: document.getElementById("city").value,
    state: document.getElementById("state").value,
    pincode: document.getElementById("pincode").value,
    country: document.getElementById("country").value,
    setDefault: document.getElementById("setDefault").checked,
  };

  try {
    const res = await axios.post("/address", payload);

    Toastify({
      text: res.data.message,
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: "#28a745" }
    }).showToast();

    setTimeout(() => location.reload(), 1000);

  } catch (err) {
    console.log(err);
    Toastify({
      text: err.response?.data?.message || "Failed to save",
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: "#ff4d4d" }
    }).showToast();
  }
});

