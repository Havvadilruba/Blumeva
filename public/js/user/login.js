document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const emailInput = document.querySelector('input[name="email"]');
  const passInput = document.querySelector('input[name="password"]');
  const eyeIcon = document.querySelector(".eye");

  // Toggle password 
  if (eyeIcon) {
    eyeIcon.addEventListener("click", () => {
      const type = passInput.getAttribute("type") === "password" ? "text" : "password";
      passInput.setAttribute("type", type);
      eyeIcon.textContent = type === "password" ? "👁" : "👁";
    });
  }

  //  Axios
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passInput.value.trim();

    if (!email || !password) {
      showToast("Please fill in all fields", "error");
      return;
    }

    try {
      const res = await axios.post("/login", { email, password });

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "Welcome back",
          text: res.data.message,
          showConfirmButton: false,
          timer: 1500,
        }).then(() => {
          window.location.href = res.data.redirectUrl;
        });
      } else {
        showToast(res.data.message, "error");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed. Try again.";
      showToast(msg, "error");
    }
  });

  function showToast(message, type = "info") {
    Toastify({
      text: message,
      duration: 4000,
      gravity: "top",
      position: "right",
      style: {
        background:
          type === "error"
            ? "linear-gradient(to right, #ef4444, #f87171)"
            : "linear-gradient(to right, #16a34a, #4ade80)",
            borderRadius: "8px",
      fontSize: "14px",
      padding: "10px 16px",
      },
    }).showToast();
  }
});
