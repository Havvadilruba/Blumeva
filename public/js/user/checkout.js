// Selected values
let selectedAddressId = null;
let selectedPaymentMethod = "razorpay";

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

// Auto-select default address on page load
window.addEventListener('DOMContentLoaded', function () {
  const defaultAddress = document.querySelector('input[name="selectedAddress"]:checked');
  if (defaultAddress) {
    selectedAddressId = defaultAddress.value;
  }
});

// ============================================
// COUPON FUNCTIONS
// ============================================

// Apply Coupon
async function applyCoupon() {
  const code = document.getElementById('couponCodeInput').value.trim().toUpperCase();

  if (!code) {
    Toastify({
      text: "Please enter a coupon code",
      duration: 2000,
      gravity: "top",
      position: "right",
      style: { background: "#ef4444" }
    }).showToast();
    return;
  }

  try {
    const response = await axios.post("/checkout/apply-coupon", { code });

    if (response.data.success) {
      Toastify({
        text: response.data.message || "Coupon applied successfully!",
        duration: 2000,
        gravity: "top",
        position: "right",
        style: { background: "#16a34a" }
      }).showToast();

      setTimeout(() => {
        window.location.href = "/checkout";
      }, 1000);
    } else {
      Toastify({
        text: response.data.message || "Failed to apply coupon",
        duration: 2000,
        gravity: "top",
        position: "right",
        style: { background: "#ef4444" }
      }).showToast();
    }
  } catch (error) {
    console.error('Coupon apply error:', error);
    Toastify({
      text: error.response?.data?.message || "Failed to apply coupon",
      duration: 2000,
      gravity: "top",
      position: "right",
      style: { background: "#ef4444" }
    }).showToast();
  }
}

// Apply coupon from modal
function applyCouponCode(code) {
  document.getElementById('couponCodeInput').value = code;
  closeCouponsModal();
  applyCoupon();
}

// Remove Coupon
async function removeCoupon() {
  if (!confirm('Remove applied coupon?')) return;

  try {
    const response = await axios.post("/checkout/remove-coupon");

    if (response.data.success) {
      Toastify({
        text: response.data.message || "Coupon removed successfully",
        duration: 2000,
        gravity: "top",
        position: "right",
        style: { background: "#16a34a" }
      }).showToast();

      setTimeout(() => {
        window.location.href = "/checkout";
      }, 1000);
    }
  } catch (error) {
    console.error('Coupon remove error:', error);
    Toastify({
      text: error.response?.data?.message || "Failed to remove coupon",
      duration: 2000,
      gravity: "top",
      position: "right",
      style: { background: "#ef4444" }
    }).showToast();
  }
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openModal() {
  document.getElementById("addressModal").style.display = "flex";
  document.getElementById("modalTitle").innerText = "Add Address";
  document.getElementById("addressForm").reset();
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("addressModal").style.display = "none";
  document.body.style.overflow = "auto";
}

function openCouponsModal() {
  document.getElementById('couponsModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeCouponsModal() {
  document.getElementById('couponsModal').style.display = 'none';
  document.body.style.overflow = 'auto';
}

// Click outside modal to close
document.getElementById('addressModal')?.addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

document.getElementById('couponsModal')?.addEventListener('click', function (e) {
  if (e.target === this) closeCouponsModal();
});

// Press ESC to close modals
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    const addressModal = document.getElementById('addressModal');
    const couponsModal = document.getElementById('couponsModal');

    if (addressModal && addressModal.style.display === 'flex') closeModal();
    if (couponsModal && couponsModal.style.display === 'flex') closeCouponsModal();
  }
});

// ============================================
// ADDRESS SAVE
// ============================================

document.getElementById("saveBtn").addEventListener("click", async () => {
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

  if (!payload.fullName || !payload.phone || !payload.address1 || !payload.city || !payload.state || !payload.pincode) {
    Toastify({
      text: "Please fill all required fields",
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: "#ef4444" }
    }).showToast();
    return;
  }

  try {
    const res = await axios.post("/address", payload);

    Toastify({
      text: res.data.message || "Address saved successfully!",
      duration: 2000,
      gravity: "top",
      position: "right",
      style: { background: "#16a34a" }
    }).showToast();

    setTimeout(() => location.reload(), 1000);

  } catch (err) {
    console.error('Address save error:', err);
    Toastify({
      text: err.response?.data?.message || "Failed to save address",
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: "#ef4444" }
    }).showToast();
  }
});

// ============================================
// PLACE ORDER (WITH RAZORPAY SUPPORT)
// ============================================

async function placeOrder() {
  const address = document.querySelector('input[name="selectedAddress"]:checked');
  if (!address) {
    Toastify({
      text: "Please select a delivery address",
      duration: 2000,
      gravity: "top",
      position: "right",
      style: { background: "#ef4444" }
    }).showToast();
    return;
  }

  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'razorpay';

  const payload = {
    addressId: address.value,
    paymentMethod: paymentMethod
  };

  const placeBtn = document.getElementById("placeOrderBtn");
  placeBtn.disabled = true;
  placeBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Processing...';

  // ============================================
  // WALLET VALIDATION
  // ============================================
  if (paymentMethod === "wallet") {
    const walletBalance = window.USER_WALLET_BALANCE || 0;
    const totalAmount = window.CART_TOTAL || 0;

    if (walletBalance < totalAmount) {
      Toastify({
        text: "Insufficient wallet balance",
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#ef4444" }
      }).showToast();
      placeBtn.disabled = false;
      placeBtn.innerHTML = '<i class="bi bi-check-circle"></i> Place Order';
      return;
    }
  }

  try {
    // ============================================
    // RAZORPAY PAYMENT FLOW
    // ============================================
    if (paymentMethod === "razorpay") {
      const res = await axios.post("/order/place", payload);
      if (!res.data.success) throw new Error("Failed to initiate payment");

      const { razorpayOrderId, amount, tempOrderId } = res.data;

      const options = {
        key: window.RAZORPAY_KEY, // From inline script
        amount,
        currency: "INR",
        order_id: razorpayOrderId,

        handler: async function (payment) {
  try {
    const verifyRes = await axios.post("/order/razorpay/verify", {
      ...payment,
      tempOrderId
    });

    console.log("🔍 VERIFY RESPONSE =", verifyRes.data); // ✅ Correct place

    if (verifyRes.data.success) {
      const orderId = verifyRes.data.orderId;

      if (!orderId) {
        console.error("⚠ No orderId returned:", verifyRes.data);
        return;
      }

      window.location.href = "/order/success/" + orderId;
      return;
    } else {
      window.location.href = `/order/failure/${tempOrderId}`;
    }

  } catch (err) {
    console.error("Payment verify error:", err);
    window.location.href = `/order/failure/${tempOrderId}`;
  }
}
,

        modal: {
          ondismiss: function () {
            Toastify({
              text: "Payment cancelled",
              duration: 2000,
              gravity: "top",
              position: "right",
              style: { background: "#ef4444" }
            }).showToast();
          }
        },

        theme: {
          color: "#2563eb"
        }
      };

      const rzp = new Razorpay(options);

      rzp.on("payment.failed", function (response) {
        console.error('Payment failed:', response.error);
        window.location.href = `/order/failure/${tempOrderId}`;
      });

      rzp.open();

      placeBtn.disabled = false;
      placeBtn.innerHTML = '<i class="bi bi-check-circle"></i> Place Order';
      return;
    }

    // ============================================
    // COD & WALLET PAYMENT FLOW
    // ============================================
    const response = await axios.post("/order/place", payload);

    if (response.data.success) {
      Toastify({
        text: "Order placed successfully!",
        duration: 2000,
        gravity: "top",
        position: "right",
        style: { background: "#16a34a" }
      }).showToast();

      setTimeout(() => {
        window.location.href = "/order/success/" + response.data.orderId;
      }, 1000);

    } else {
      throw new Error(response.data.message || "Failed to place order");
    }

  } catch (err) {
    console.error('Order placement error:', err);

    Toastify({
      text: err.response?.data?.message || err.message || "Failed to place order",
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: "#ef4444" }
    }).showToast();

    placeBtn.disabled = false;
    placeBtn.innerHTML = '<i class="bi bi-check-circle"></i> Place Order';
  }
}