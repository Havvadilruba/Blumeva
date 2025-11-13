document.addEventListener("DOMContentLoaded", () => {

  const searchInput = document.getElementById("searchInput");
  const searchForm = document.getElementById("searchForm");
  const clearSearch = document.getElementById("clearSearch");

  if (searchInput && searchForm) {
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

  if (clearSearch) {
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

      try {
        const res = await axios.post(url, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data.success) {
          showToast(res.data.message, "success");
          setTimeout(() => (window.location.href = res.data.redirectUrl), 1500);
        }
      } catch (error) {
        handleAxiosError(error, "adding category");
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

      try {
        const res = await axios.patch(url, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data.success) {
          showToast(res.data.message, "success");
          setTimeout(() => (window.location.href = res.data.redirectUrl), 1500);
        }
      } catch (error) {
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
      showToast("Server error ", "error");
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

