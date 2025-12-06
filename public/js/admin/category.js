document.addEventListener("DOMContentLoaded", () => {

  const searchInput = document.getElementById("searchInput");
  const searchForm = document.getElementById("searchForm");
  const clearSearch = document.getElementById("clearSearch");

  // Only initialize search if we're on the category list page
  const isCategoryListPage = window.location.pathname === "/admin/category";
  
  if (searchInput && searchForm && isCategoryListPage) {
    let debounceTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (searchInput.value.trim().length > 0) {
          searchForm.requestSubmit();
        } else {
          window.location.href = "/admin/category";
        }
      }, 400);
    });
  }

  if (clearSearch && isCategoryListPage) {
    clearSearch.addEventListener("click", (e) => {
      e.preventDefault();
      searchInput.value = "";
      window.location.href = "/admin/category";
    });
  }

  const fileInput = document.getElementById("image");
  const previewImg = document.getElementById("preview");

  if (fileInput && previewImg) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        previewImg.src = URL.createObjectURL(file);
        previewImg.style.display = "block";
      }
    });
  }


  // ADD CATEGORY

  const addForm = document.getElementById("categoryForm");
  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(addForm);
      const url = addForm.getAttribute("action"); 

      for (let [key, value] of formData.entries()) {
      }

      try {
        const res = await axios.post(url, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });


        if (res.data.success) {
          showToast(res.data.message, "success");
          setTimeout(() => (window.location.href = res.data.redirectUrl), 1500);
        } else {
          showToast(res.data.message || "Failed to add category", "error");
        }
      } catch (error) {
       
        if (error.response?.data?.message) {
          showToast(error.response.data.message, "error");
        } else if (error.response?.status === 500) {
          showToast("Server error: " + (error.response.data || "Unknown error"), "error");
        } else if (error.request) {
          showToast("No response from server. Check your connection.", "error");
        } else {
          showToast("Error: " + error.message, "error");
        }
      }
    });
  }


  // EDIT CATEGORY 

  const editForm = document.getElementById("editCategoryForm");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(editForm);
      const url = editForm.getAttribute("action");

      console.log("Edit form submission started");
      console.log("URL:", url);

      try {
        const res = await axios.patch(url, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data.success) {
          showToast(res.data.message, "success");
          setTimeout(() => (window.location.href = res.data.redirectUrl), 1500);
        }
      } catch (error) {
        console.log("Full Axios Error Response:", error.response?.data);
        handleAxiosError(error, "updating category");
      }
    });
  }


  // TOGGLE 

  const toggleButtons = document.querySelectorAll(".btn-toggle");

  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const id = btn.dataset.id;

      try {
        const res = await axios.patch(`/admin/category/toggle/${id}`);
        if (res.data.success) {
          showToast(res.data.message, "success");
          setTimeout(() => window.location.reload(), 1000);
        } else {
          showToast(res.data.message, "error");
        }
      } catch (err) {
        console.error("Toggle error:", err);
        showToast("Server error", "error");
      }
    });
  });

});

function handleAxiosError(error, action = "performing action") {
  console.error(`Error ${action}:`, error);

  if (error.response && error.response.data) {
    const message =
      error.response.data.message ||
      `An error occurred while ${action}.`;
    showToast(message, "error");
  } else {
    showToast(`Server error while ${action}.`, "error");
  }
}

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
    duration: 3000,
    gravity: "top",
    position: "right",
    close: true,
  }).showToast();
}