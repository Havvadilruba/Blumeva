// ================================
// Toast Notification Function
// ================================
function notify(message, type = "info") {
  Toastify({
    text: message,
    duration: 3000,
    gravity: "top",
    position: "right",
    backgroundColor:
      type === "success" ? "#16a34a" : type === "error" ? "#dc2626" : "#3b82f6",
  }).showToast();
}

// ================================
// Update Order Status
// ================================
async function updateOrderStatus() {
  const orderId = document.querySelector("[data-order-id]")?.dataset.orderId;
  const status = document.getElementById("statusSelect").value;

  if (!confirm(`Set order status to ${status}?`)) return;

  try {
    const res = await axios.patch(`/admin/orders/${orderId}/status`, { status });
    if (res.data.success) {
      notify("Order status updated!", "success");
      setTimeout(() => window.location.reload(), 800);
    }
  } catch (err) {
    notify("Error updating status", "error");
    console.log(err);
  }
}

// ================================
// Update Payment Status
// ================================
async function updatePaymentStatus() {
  const orderId = document.querySelector("[data-order-id]")?.dataset.orderId;
  const paymentStatus = document.getElementById("paymentStatusSelect").value;

  if (!confirm(`Update payment status to ${paymentStatus}?`)) return;

  try {
    const res = await axios.patch(`/admin/orders/${orderId}/payment-status`, {
      paymentStatus,
    });

    if (res.data.success) {
      notify("Payment status updated!", "success");
      setTimeout(() => window.location.reload(), 800);
    }
  } catch (err) {
    notify("Error updating payment", "error");
  }
}

// ================================
// Download Invoice
// ================================
function downloadInvoice() {
  const orderId = document.querySelector("[data-order-id]")?.dataset.orderId;
  window.location.href = `/admin/orders/${orderId}/invoice`;
}

// ================================
// Auto filter status forward only
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("statusSelect");
  if (!select) return;

  const flow = [
    "Pending",
    "Confirmed",
    "Processing",
    "Shipped",
    "Out for Delivery",
    "Delivered",
  ];

  const currentIndex = flow.indexOf(select.value);

  [...select.options].forEach((opt) => {
    const idx = flow.indexOf(opt.value);
    if (idx < currentIndex) opt.disabled = true; // disable past statuses
  });
});
