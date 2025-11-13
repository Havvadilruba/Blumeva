document.addEventListener("DOMContentLoaded", () => {
  const inputs = document.querySelectorAll(".otp-inputs input");
  const resendLink = document.getElementById("resendOtp");
  const timerDisplay = document.getElementById("timer");
  const otpForm = document.querySelector(".otp-form");

  const verifyUrl = otpForm.getAttribute("action");
  const resendUrl = resendLink.getAttribute("href");

  inputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      if (input.value && index < inputs.length - 1) inputs[index + 1].focus();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && index > 0) inputs[index - 1].focus();
    });
  });

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

  //OTP Verification 
  otpForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const otp = Array.from(inputs).map((i) => i.value).join("");
    if (otp.length !== 6) {
      Swal.fire({
        icon: "warning",
        title: "Incomplete OTP",
        text: "Please enter all 6 digits.",
      });
      return;
    }

    try {
      const res = await axios.post(verifyUrl, { otp });
      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: res.data.message || "OTP Verified",
          showConfirmButton: false,
          timer: 1500,
        }).then(() => {
          window.location.href = res.data.redirectUrl;
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Invalid OTP",
          text: res.data.message,
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Something went wrong";
      Swal.fire({ icon: "error", title: "Error", text: msg });
    }
  });

  // Resend OTP
  resendLink.addEventListener("click", async (e) => {
    e.preventDefault();
    if (resendLink.classList.contains("disabled")) return;

    try {
      const res = await axios.post(resendUrl);
      if (res.data.success) {
        Toastify({
          text: "📨 New OTP sent successfully!",
          duration: 4000,
          gravity: "top",
          position: "center",
          backgroundColor: "linear-gradient(to right, #2563eb, #60a5fa)",
        }).showToast();
        startTimer();
      } else {
        Toastify({
          text: res.data.message || "Failed to resend OTP",
          duration: 4000,
          gravity: "top",
          position: "center",
          backgroundColor: "linear-gradient(to right, #ef4444, #f87171)",
        }).showToast();
      }
    } catch {
      Toastify({
        text: "Server error while resending OTP",
        duration: 4000,
        gravity: "top",
        position: "center",
        backgroundColor: "linear-gradient(to right, #ef4444, #f87171)",
      }).showToast();
    }
  });
});

