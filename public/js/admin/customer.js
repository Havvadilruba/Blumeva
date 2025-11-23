document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const searchForm = document.getElementById("searchForm");
  const clearSearch = document.getElementById("clearSearch");
  const toggleBtn = document.getElementById("blockToggleBtn");
  const toggleButtons = document.querySelectorAll(".toggle-btn");

  if (searchInput && searchForm) {
  let debounceTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
        console.log("Searching for:", searchInput.value);
      searchForm.submit();
    }, 400);
  });
}

if (clearSearch) {
  clearSearch.addEventListener("click", (e) => {
    e.preventDefault();
    searchInput.value = "";
    window.location.href = "/admin/customers";
  });
}


  const modal = document.getElementById("confirmModal");
  const title = document.getElementById("confirmTitle");
  const message = document.getElementById("confirmMessage");
  const confirmBtn = document.getElementById("confirmOk");
  const cancelBtn = document.getElementById("confirmCancel");

  let activeBtn = null;

  function openModal(btn) {
    activeBtn = btn;
    const isBlocked = btn.dataset.status === "true";
    title.textContent = isBlocked ? "Unblock User?" : "Block User?";
    message.textContent = isBlocked
      ? "Are you sure you want to unblock this user? They will regain access."
      : "Are you sure you want to block this user? They will lose access.";
    modal.classList.add("show");
  }

  cancelBtn.addEventListener("click", () => modal.classList.remove("show"));


  confirmBtn.addEventListener("click", async () => {
    if (!activeBtn) return;
    const id = activeBtn.dataset.id;

    try {
      const res = await axios.patch(`/admin/customers/toggle/${id}`);
      if (res.data.success) {
        const isBlockedNow = res.data.isBlocked;

        const row = activeBtn.closest("tr");
        if (row) {
          const status = row.querySelector(".status");
          status.textContent = isBlockedNow ? "Blocked" : "Active";
          status.classList.toggle("blocked", isBlockedNow);
          status.classList.toggle("active", !isBlockedNow);
        }

        if (activeBtn.id === "blockToggleBtn") {
          activeBtn.textContent = isBlockedNow
            ? "Unblock Customer"
            : "Block Customer";
          activeBtn.classList.toggle("btn-danger", !isBlockedNow);
          activeBtn.classList.toggle("btn-success", isBlockedNow);
        }

        activeBtn.dataset.status = isBlockedNow;
        showToast(res.data.message, "success");
      } else {
        showToast(res.data.message || "Action failed", "error");
      }
    } catch (err) {
      console.error("Toggle error:", err);
      showToast("Server error while toggling user", "error");
    } finally {
      modal.classList.remove("show");
      activeBtn = null;
    }
  });

 
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => openModal(toggleBtn));
  }
  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openModal(btn);
    });
  });
});

function showToast(message, type = "info") {
  const colors = {
    success: "#4CAF50",
    error: "#e74c3c",
    warning: "#f39c12",
    info: "#3498db",
  };
  Toastify({
    text: message,
    backgroundColor: colors[type] || colors.info,
    duration: 2500,
    gravity: "top",
    position: "right",
    close: true,
  }).showToast();
}
