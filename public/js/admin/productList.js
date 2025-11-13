document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const searchForm = document.getElementById("searchForm");
  const clearSearch = document.getElementById("clearSearch");
  const blockButtons = document.querySelectorAll(".block-btn");
  //  search 
  if (searchInput && searchForm) {
    let debounceTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchForm.submit();
      }, 400);
    });
  }

  // Clear search
  if (clearSearch) {
    clearSearch.addEventListener("click", (e) => {
      e.preventDefault();
      searchInput.value = "";
      window.location.href = "/admin/products";
    });
  }


  blockButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();

      const url = btn.getAttribute("href");
      const row = btn.closest("tr");
      const statusLabel = row.querySelector(".status");
      const icon = btn.querySelector("i");

      try {
        const res = await axios.patch(url);

        if (res.data.success) {
          const isBlockedNow = res.data.isBlocked;

          // Update status text
          if (isBlockedNow) {
            statusLabel.textContent = "Blocked";
            statusLabel.classList.remove("active");
            statusLabel.classList.add("blocked");

            // Change icon
            icon.classList.remove("ri-lock-line");
            icon.classList.add("ri-lock-unlock-line");

            showToast("Product blocked", "warning");
          } else {
            statusLabel.textContent = "Active";
            statusLabel.classList.remove("blocked");
            statusLabel.classList.add("active");

            icon.classList.remove("ri-lock-unlock-line");
            icon.classList.add("ri-lock-line");

            showToast("Product unblocked", "success");
          }
        } else {
          showToast("Failed to toggle product", "error");
        }
      } catch (error) {
        console.error("Error toggling product:", error);
        showToast("Server error while toggling product", "error");
      }
    });
  });
});
