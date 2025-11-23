document.addEventListener("DOMContentLoaded", () => {
  const savePasswordBtn = document.getElementById("savePasswordBtn");

  savePasswordBtn.addEventListener("click", async () => {
    const currentPassword = document.getElementById("currentPassword").value.trim();
    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return Toastify({
        text: "All fields are required",
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#ff4d4d" }
      }).showToast();
    }

    try {
      const response = await axios.post("/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      Toastify({
        text: response.data.message,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#28a745" }
      }).showToast();

      setTimeout(() => {
        window.location.href = "/profile";
      }, 1200);

    } catch (error) {
      Toastify({
        text: error.response?.data?.message || "Something went wrong",
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#ff4d4d" }
      }).showToast();
    }
  });
});
