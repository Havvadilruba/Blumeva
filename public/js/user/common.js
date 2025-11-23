function showToast(message, type = "info") {
  const colors = {
    success: "#28a745",
    warning: "#ffc107",
    danger: "#dc3545",
    info: "#0d6efd",
  };

  Toastify({
    text: message,
    duration: 2000,
    close: true,
    gravity: "top",
    position: "right",
    style: { background: colors[type] },
  }).showToast();
}


async function addToCart(event, variantId) {
  event.stopPropagation();

  console.log("variantId from card:", variantId);

  try {
    const res = await axios.post("/cart/add", { variantId });

    if (res.status === 201 && res.data.success) {
      showToast(res.data.message, "success");
      return;
    }

  } catch (err) {
    const backendMessage = err.response?.data?.message;

    if (backendMessage) {
      showToast(backendMessage, "danger");
      return;
    }

    showToast("❌ Something went wrong", "danger");
  }
}


