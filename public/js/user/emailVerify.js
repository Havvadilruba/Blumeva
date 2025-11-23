document.addEventListener("DOMContentLoaded", () => {
  const inputs = document.querySelectorAll(".otp-inputs input");
  const verifyBtn = document.getElementById("verifyOtpBtn");
  const resendLink = document.getElementById("resendOtp");
  const timerDisplay = document.getElementById("timer");

  // Autofocus & Backspace control
  inputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      if (input.value && index < inputs.length - 1) inputs[index + 1].focus();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && index > 0) inputs[index - 1].focus();
    });
  });

  // Timer
  function startTimer() {
    let timeLeft = 60;
    resendLink.classList.add("disabled");
    resendLink.style.pointerEvents = "none";
    clearInterval(window.timerInterval);

    window.timerInterval = setInterval(() => {
      const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
      const seconds = String(timeLeft % 60).padStart(2, "0");
      timerDisplay.textContent = `${minutes}:${seconds}`;

      if (timeLeft <= 0) {
        clearInterval(window.timerInterval);
        timerDisplay.textContent = "00:00";
        resendLink.classList.remove("disabled");
        resendLink.style.pointerEvents = "auto";
      }
      timeLeft--;
    }, 1000);
  }

  startTimer();

  // Verify OTP
  verifyBtn.addEventListener("click", async () => {
    const otp = Array.from(inputs).map((i) => i.value).join("");

    if (otp.length !== 6) {
      Toastify({
        text: "Please enter all 6 digits",
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#ff4d4d" }
      }).showToast();
      return;
    }

    try {
      const res = await axios.post("/email-verify", { otp });

      Toastify({
        text: res.data.message,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#28a745" }
      }).showToast();

      setTimeout(() => {
        window.location.href = "/profile";
      }, 1200);

    } catch (err) {
      Toastify({
        text: err.response?.data?.message || "Something went wrong",
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#ff4d4d" }
      }).showToast();
    }
  });

  // ---- RESEND OTP ----
  resendLink.addEventListener("click", async (e) => {
    e.preventDefault();
    if (resendLink.classList.contains("disabled")) return;

    try {
      const res = await axios.post("/resend-email-otp");

      Toastify({
        text: "New OTP sent successfully!",
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#2563eb" }
      }).showToast();

      startTimer();

    } catch (err) {
      Toastify({
        text: err.response?.data?.message || "Failed to resend OTP",
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#ff4d4d" }
      }).showToast();
    }
  });
});

