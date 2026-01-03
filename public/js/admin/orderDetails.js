
function notify(message, type = "info") {
  Toastify({
    text: message,
    duration: 3000,
    gravity: "top",
    position: "right",
    style: {
      background:
        type === "success"
          ? "#16a34a"
          : type === "error"
          ? "#dc2626"
          : "#3b82f6",
    },
  }).showToast();
}

// ==============================
// CUSTOM CONFIRMATION MODAL
// ==============================
function showConfirmModal(title, message, onConfirm, onCancel) {
  // Create modal HTML
  const modalHTML = `
    <div class="confirm-modal-overlay" id="confirmModal">
      <div class="confirm-modal">
        <div class="confirm-modal-header">
          <h3>${title}</h3>
        </div>
        <div class="confirm-modal-body">
          <p>${message}</p>
        </div>
        <div class="confirm-modal-footer">
          <button class="btn-cancel" id="modalCancel">Cancel</button>
          <button class="btn-confirm" id="modalConfirm">Confirm</button>
        </div>
      </div>
    </div>
  `;

  // Insert modal into DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('confirmModal');
  const confirmBtn = document.getElementById('modalConfirm');
  const cancelBtn = document.getElementById('modalCancel');

  // Show modal with animation
  setTimeout(() => modal.classList.add('show'), 10);

  // Confirm action
  confirmBtn.onclick = () => {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
      if (onConfirm) onConfirm();
    }, 300);
  };

  // Cancel action
  const handleCancel = () => {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
      if (onCancel) onCancel();
    }, 300);
  };

  cancelBtn.onclick = handleCancel;
  
  // Close on overlay click
  modal.onclick = (e) => {
    if (e.target === modal) handleCancel();
  };

  // Close on ESC key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// Update Order Status
async function updateOrderStatus() {
  const orderId = document.querySelector("[data-order-id]")?.dataset.orderId;
  const newStatus = document.getElementById("statusSelect").value;

  if (!orderId) {
    notify("Order ID not found", "error");
    return;
  }

  showConfirmModal(
    'Update Order Status',
    `Are you sure you want to update the status to "<strong>${newStatus}</strong>"?`,
    async () => {
      try {
        const res = await axios.patch(`/admin/orders/${orderId}/status`, {
          status: newStatus,
        });

        if (res.data.success) {
          notify("Order status updated successfully!", "success");
          setTimeout(() => window.location.reload(), 800);
        } else {
          notify(res.data.message || "Failed to update order status", "error");
        }
      } catch (err) {
        console.error("Update order status error:", err);
        notify(
          err.response?.data?.message || "Error updating order status",
          "error"
        );
      }
    }
  );
}

// Update Payment Status
async function updatePaymentStatus(event) {
  const orderId = document.querySelector("[data-order-id]")?.dataset.orderId;
  const newPaymentStatus = document.getElementById("paymentStatusSelect").value;

  if (!orderId) {
    notify("Order ID not found", "error");
    return;
  }

  const btn = event?.target?.closest("button");
  const original = btn ? btn.innerHTML : null;

  showConfirmModal(
    'Update Payment Status',
    `Are you sure you want to update the payment status to "<strong>${newPaymentStatus}</strong>"?`,
    async () => {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="bi bi-hourglass-split"></i> Updating...`;
      }

      try {
        const res = await axios.patch(`/admin/orders/${orderId}/payment-status`, {
          paymentStatus: newPaymentStatus,
        });

        if (res.data.success) {
          notify("Payment status updated successfully!", "success");
          setTimeout(() => window.location.reload(), 800);
        } else {
          notify(res.data.message || "Failed to update payment status", "error");
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = original;
          }
        }
      } catch (err) {
        console.error("Update payment status error:", err);
        notify(
          err.response?.data?.message || "Error updating payment status",
          "error"
        );
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = original;
        }
      }
    },
    () => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    }
  );
}

// Download Invoice
function downloadInvoice() {
  const orderId = document.querySelector("[data-order-id]")?.dataset.orderId;
  if (!orderId) {
    notify("Order ID not found", "error");
    return;
  }
  window.location.href = `/admin/orders/${orderId}/invoice`;
}

// Handle Return Request (Approve/Reject)
async function handleReturn(orderId, itemId, action) {
  const adminNoteElement = document.getElementById(`adminNote_${itemId}`);
  const adminNote = adminNoteElement ? adminNoteElement.value.trim() : "";

  const actionText = action === 'approve' ? 'approve' : 'reject';
  const actionColor = action === 'approve' ? '#16a34a' : '#dc2626';

  showConfirmModal(
    `${action.charAt(0).toUpperCase() + action.slice(1)} Return Request`,
    `Are you sure you want to <strong style="color: ${actionColor}">${actionText}</strong> this return request?`,
    async () => {
      // Disable buttons
      const btns = document.querySelectorAll(`button[onclick*="${itemId}"]`);
      btns.forEach((b) => {
        b.disabled = true;
        b.style.opacity = "0.6";
      });

      try {
        const res = await axios.patch(`/admin/orders/${orderId}/return-request`, {
          itemId,
          action,
          adminNote: adminNote || undefined,
        });

        if (res.data.success) {
          notify(
            res.data.message || `Return ${actionText}ed successfully`,
            "success"
          );
          setTimeout(() => window.location.reload(), 800);
        } else {
          notify(res.data.message || "Failed to update request", "error");
          btns.forEach((b) => {
            b.disabled = false;
            b.style.opacity = "1";
          });
        }
      } catch (err) {
        console.error("Handle return error:", err);
        notify(
          err.response?.data?.message || "Error while processing return request",
          "error"
        );
        btns.forEach((b) => {
          b.disabled = false;
          b.style.opacity = "1";
        });
      }
    }
  );
}

// Mark Item Returned
async function markItemReturned(orderId, itemId) {
  const btn = event?.target?.closest("button") || 
               document.querySelector(`button[onclick*="markItemReturned"][onclick*="${itemId}"]`);
  
  const original = btn ? btn.innerHTML : null;

  showConfirmModal(
    'Mark Item as Returned',
    'Confirm that you have <strong>received this returned item</strong>?',
    async () => {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="bi bi-hourglass-split"></i> Processing...`;
      }

      try {
        const res = await axios.patch(`/admin/orders/${orderId}/mark-returned`, {
          itemId,
        });

        if (res.data.success) {
          notify(res.data.message || "Item marked returned successfully", "success");
          setTimeout(() => window.location.reload(), 800);
        } else {
          notify(res.data.message || "Failed to mark item returned", "error");
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = original;
          }
        }
      } catch (err) {
        console.error("Mark item returned error:", err);
        notify(
          err.response?.data?.message || "Error while marking item returned",
          "error"
        );
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = original;
        }
      }
    },
    () => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    }
  );
}

// Filter Status Options (prevent going backwards)
function filterStatusOptions() {
  const select = document.getElementById("statusSelect");
  if (!select) return;

  let current = select.value;
  
  // Remove "Partially" prefix if present to get base status
  current = current.replace(/^Partially\s+/, '');
  
  const flow = [
    "Pending",
    "Confirmed",
    "Processing",
    "Shipped",
    "Out for Delivery",
    "Delivered",
  ];
  const currentIndex = flow.indexOf(current);

  // Remove options that come before current status
  const optionsArray = Array.from(select.options);
  optionsArray.forEach((opt) => {
    const i = flow.indexOf(opt.value);
    if (i !== -1 && i < currentIndex) {
      opt.remove();
    }
  });

  // Set the select value to base status (without "Partially")
  select.value = current;
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  // Filter status options to prevent backwards flow
  filterStatusOptions();

  // Scroll to return requests if hash is present
  if (window.location.hash === "#returns") {
    const returnSection = document.querySelector(".return-request-section");
    if (returnSection) {
      returnSection.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }
});