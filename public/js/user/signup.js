document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signform");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const cpassword = document.getElementById("confirm").value;
    const referralCode = document.getElementById("referral").value.trim();


    try {
      const res = await axios.post("/signup", { 
  name, email, password, cpassword, referralCode 
});


      if (res.data.success) {
        Toastify({
          text: " OTP sent to your email!",
          duration: 3000,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #2563eb, #60a5fa)",
          borderRadius: "8px",
          fontSize: "14px",
          padding: "10px 16px",
        }).showToast();

        setTimeout(() => {
          window.location.href = res.data.redirectUrl;
        }, 1000);
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Something went wrong";
      showError(msg);
    }
  });

  function showError(message) {
    Toastify({
      text: `${message}`,
      duration: 4000,
      gravity: "top",
      position: "right", 
      backgroundColor: "linear-gradient(to right, #ef4444, #f87171)",
      borderRadius: "8px",
      fontSize: "14px",
      padding: "10px 16px",
    }).showToast();
  }
});

