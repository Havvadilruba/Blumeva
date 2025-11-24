
   const orderItems = <%- JSON.stringify(order.orderedItems) %>;
  let selectedItemIds = [];
  const activeOrderId = document.querySelector(".order-detail-page")?.dataset.orderId;

  function showCancelOrderModal() {
    selectedItemIds = orderItems.map(item => item._id);
    document.getElementById("cancelOrderModal").style.display = "flex";
  }

  function closeCancelOrderModal() {
    document.getElementById("cancelOrderModal").style.display = "none";
  }

  function showCancelItemModal(itemId, name) {
    selectedItemIds = [itemId];
    document.getElementById("cancelItemName").innerText = name;
    document.getElementById("cancelItemModal").style.display = "flex";
  }

  function closeCancelItemModal() {
    document.getElementById("cancelItemModal").style.display = "none";
  }

  async function confirmCancel(isFull = false) {
    const reason = document.getElementById(isFull ? "cancelOrderReason" : "cancelItemReason").value;

    try {
      const { data } = await axios.post(`/orders/${activeOrderId}/cancel-item`, {
        itemIds: selectedItemIds,
        reason
      });

      if (data.success) {
        Toastify({ text: "Order cancelled successfully!", duration: 2000 }).showToast();
        setTimeout(() => location.reload(), 1000);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  }

