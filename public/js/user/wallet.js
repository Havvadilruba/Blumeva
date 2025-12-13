function openAddMoneyModal() {
  document.getElementById("addMoneyModal").classList.remove("hidden");
  document.getElementById("addMoneyModal").classList.add("flex");
}

function closeAddMoneyModal() {
  document.getElementById("addMoneyModal").classList.add("hidden");
  document.getElementById("addMoneyModal").classList.remove("flex");
  document.getElementById("addMoneyForm").reset();
}

// Set quick amount
function setAmount(amount) {
  document.getElementById("addAmount").value = amount;
}

// Add Money Form Submit
document.getElementById("addMoneyForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const amount = Number(formData.get("amount"));

    if (!amount || amount < 100 || amount > 50000) {
      Toastify({
        text: "Amount must be between ₹100 and ₹50,000",
        duration: 3000,
        gravity: "bottom",
        position: "right",
        backgroundColor: "#ef4444",
      }).showToast();
      return;
    }

    try {
      // Create Razorpay Order
      const orderRes = await axios.post("/wallet/add-money", { amount });
      const order = orderRes.data.order;

      const options = {
        key: window.RAZORPAY_KEY,
        amount: order.amount,
        currency: "INR",
        name: "Blumeva",
        description: "Wallet Top-up",
        order_id: order.id,

        // Payment success handler
        handler: async function (response) {
          try {
            const verifyRes = await axios.post("/wallet/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: order.amount, // always send correct paise amount
            });

            if (verifyRes.data.success) {
              Toastify({
                text: verifyRes.data.message,
                duration: 3000,
                gravity: "bottom",
                position: "right",
                backgroundColor: "#10b981",
              }).showToast();

              closeAddMoneyModal();
              setTimeout(() => window.location.reload(), 1000);
            }
          } catch (err) {
            console.error("Verification Error:", err);
            Toastify({
              text: "Payment verification failed!",
              duration: 3000,
              gravity: "bottom",
              position: "right",
              backgroundColor: "#ef4444",
            }).showToast();
          }
        },
      };

      const rzp = new Razorpay(options);

      rzp.on("payment.failed", function (response) {
        console.error("Payment Failed:", response.error);
        Toastify({
          text: "Payment failed",
          duration: 3000,
          gravity: "bottom",
          position: "right",
          backgroundColor: "#ef4444",
        }).showToast();
      });

      rzp.open();

    } catch (error) {
      console.error("Error adding money:", error);

      Toastify({
        text: error.response?.data?.message || "Failed to add money",
        duration: 3000,
        gravity: "bottom",
        position: "right",
        backgroundColor: "#ef4444",
      }).showToast();
    }
  });

// Filter transactions
function filterTransactions(type) {
  const url = new URL(window.location.href);
  if (type) url.searchParams.set("type", type);
  else url.searchParams.delete("type");

  url.searchParams.set("page", "1");
  window.location.href = url.toString();
}

// Pagination
function changeWalletPage(page) {
  const url = new URL(window.location.href);
  url.searchParams.set("page", page);
  window.location.href = url.toString();
}
