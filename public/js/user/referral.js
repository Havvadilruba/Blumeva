document.addEventListener("DOMContentLoaded", () => {
  const codeEl = document.getElementById("myCode");
  if (!codeEl) return;

  codeEl.addEventListener("click", () => {
    const code = codeEl.textContent.trim();
    navigator.clipboard.writeText(code).then(() => {
      Toastify({ text: "Referral code copied", duration: 2000, gravity: "bottom", position: "right" }).showToast();
    }).catch(()=> {});
  });
});
