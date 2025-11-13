document.addEventListener("DOMContentLoaded", () => {

  const toast = (msg, type = "success") => {
    Toastify({
      text: msg,
      duration: 3000,
      gravity: "top",
      position: "right",
      backgroundColor: type === "success" ? "#4caf50" : "#f44336",
      close: true,
    }).showToast();
  };

  const searchInput = document.getElementById("searchInput");
  const searchForm = document.getElementById("searchForm");
  const clearSearch = document.getElementById("clearSearch");

  if (searchInput && searchForm) {
    let debounceTimer;

    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = searchInput.value.trim();
        const url = new URL(window.location.href);

        if (query.length > 0) {
          url.searchParams.set("search", query);
          url.searchParams.set("page", "1");
          window.location.href = url.toString();
        } else {
          window.location.href = "/admin/brands";
        }
      }, 400);
    });
  }

  if (clearSearch) {
    clearSearch.addEventListener("click", (e) => {
      e.preventDefault();
      searchInput.value = "";
      window.location.href = "/admin/brands";
    });
  }


  const closeModal = (id) => document.getElementById(id)?.classList.remove("show");

  document.getElementById("openAddBrandModal")?.addEventListener("click", () => {
    document.getElementById("addBrandModal").classList.add("show");
  });

  document.getElementById("cancelAddModal")?.addEventListener("click", () => closeModal("addBrandModal"));
  document.getElementById("cancelEditModal")?.addEventListener("click", () => closeModal("editBrandModal"));


  const addForm = document.getElementById("addBrandForm");
  addForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(addForm);

    try {
      const res = await axios.post("/admin/brands/add", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast(res.data.message, res.data.success ? "success" : "error");

      if (res.data.success) {
        closeModal("addBrandModal");
        setTimeout(() => location.reload(), 1000);
      }
    } catch (err) {
      const message = err.response?.data?.message || "Error adding brand";
      toast(message, "error");
    }
  });

  
  window.openEditModal = (id, name, logo, status) => {
    const modal = document.getElementById("editBrandModal");
    modal.classList.add("show");

    const form = document.getElementById("editBrandForm");
    form.dataset.id = id;

    document.getElementById("editBrandName").value = name;
    document.getElementById("editBrandLogoPreview").src = logo;
    document.getElementById("editBrandStatusSelect").value = status ? "on" : "off";
  };

  // EDIT BRAND

  const editForm = document.getElementById("editBrandForm");
  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = e.target.dataset.id;
    const formData = new FormData(editForm);

    try {
      const res = await axios.patch(`/admin/brands/edit/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast(res.data.message, res.data.success ? "success" : "error");

      if (res.data.success) {
        closeModal("editBrandModal");
        setTimeout(() => location.reload(), 1000);
      }
    } catch (err) {
      const message = err.response?.data?.message || "Error updating brand";
      toast(message, "error");
    }
  });


  // TOGGLE STATUS

  window.toggleStatus = async (id) => {
    try {
      const res = await axios.patch(`/admin/brands/toggle/${id}`);
      toast(res.data.message, res.data.success ? "success" : "error");
      if (res.data.success) setTimeout(() => location.reload(), 800);
    } catch (err) {
      toast(err.response?.data?.message || "Error toggling brand", "error");
    }
  };
});

