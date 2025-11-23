
  document.getElementById("sendOtpBtn").addEventListener("click", async () => {
    const newEmail = document.getElementById("newEmailInput").value;

    if (!newEmail) {
      Toastify({
        text: "Please enter a new email",
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#ff4d4d" }
      }).showToast();
      return;
    }

    try {
      const response = await axios.post("/send-email-otp", { newEmail });

      Toastify({
        text: response.data.message,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#28a745" }
      }).showToast();

      setTimeout(() => {
        window.location.href = "/email-verify";
      }, 1200);

    } catch (error) {
        console.log(error)
      Toastify({
        text: error.response?.data?.message || "Something went wrong",
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#ff4d4d" }
      }).showToast();
    }
  });

