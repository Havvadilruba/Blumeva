let activeOrderId = null;

function openCancelModal(orderId) {
  activeOrderId = orderId;
  document.getElementById("cancelModal").style.display = "flex";
}

function closeCancelModal() {
  document.getElementById("cancelModal").style.display = "none";
}

function openReturnModal(orderId) {
  activeOrderId = orderId;
  document.getElementById("returnModal").style.display = "flex";
}

function closeReturnModal() {
  document.getElementById("returnModal").style.display = "none";
}

async function confirmCancel() {
  const reason = document.getElementById("cancelReason").value;

  try {
    const { data } = await axios.post("/orders/cancel", {
      orderId: activeOrderId,
      reason
    });

    if (data.success) {
      location.reload();
    } else {
      alert(data.msg || "Failed to cancel order");
    }
  } catch (err) {
    console.error(err);
    alert("Something went wrong");
  }
}

async function confirmReturn() {
  const reason = document.getElementById("returnReason").value.trim();
  if (!reason) return alert("Return reason is required");

  try {
    const { data } = await axios.post("/orders/return", {
      orderId: activeOrderId,
      reason
    });

    if (data.success) {
      location.reload();
    } else {
      alert(data.msg || "Failed to request return");
    }
  } catch (err) {
    console.error(err);
    alert("Something went wrong");
  }
}

