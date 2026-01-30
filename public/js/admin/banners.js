

let isEditMode = false;
let currentBannerId = null;
let isSubmitting = false;

function showToast(message, type = "success") {
  Toastify({
    text: message,
    duration: 4000,
    close: true,
    gravity: "top",
    position: "right",
    stopOnFocus: true,
    style: {
      background:
        type === "success"
          ? "linear-gradient(to right, #00b09b, #96c93d)"
          : "linear-gradient(to right, #ff5f6d, #ffc371)",
    },
  }).showToast();
}

// -------------------------------
// Modal Helpers
// -------------------------------
function showModal() {
  const modal = document.getElementById("bannerModal");
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("show"), 10);
}

function hideModal() {
  const modal = document.getElementById("bannerModal");
  modal.classList.remove("show");
  setTimeout(() => (modal.style.display = "none"), 300);
}

function openAddBannerModal() {
  isEditMode = false;
  currentBannerId = null;

  document.getElementById("modalTitle").textContent = "Add New Banner";
  document.getElementById("submitBtnText").textContent = "Create Banner";
  document.getElementById("bannerForm").reset();
  document.getElementById("bannerId").value = "";

  const preview = document.getElementById("imagePreview");
  preview.classList.remove("has-image");
  preview.innerHTML = `
    <i class="bi bi-image"></i>
    <span>Click to upload banner image</span>
  `;

  showModal();
}

function closeBannerModal() {
  if (isSubmitting) return;
  hideModal();
  document.getElementById("bannerForm").reset();
}

// -------------------------------
// Button State Helper
// -------------------------------
function setSubmitButton(loading, text) {
  const btn = document.getElementById("submitBtn");
  const btnText = document.getElementById("submitBtnText");

  btn.disabled = loading;
  btn.style.opacity = loading ? "0.6" : "1";
  btn.style.cursor = loading ? "not-allowed" : "pointer";
  btnText.innerHTML = loading
    ? `<i class="bi bi-hourglass-split"></i> ${text}`
    : text;
}

// -------------------------------
// Image Preview
// -------------------------------
function previewImage(input) {
  const preview = document.getElementById("imagePreview");

  if (!input.files || !input.files[0]) return;

  const file = input.files[0];

  if (file.size > 2 * 1024 * 1024) {
    showToast("Image size must be less than 2MB", "error");
    input.value = "";
    return;
  }

  if (!file.type.startsWith("image/")) {
    showToast("Please select a valid image file", "error");
    input.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    preview.classList.add("has-image");
    preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
  };
  reader.readAsDataURL(file);
}

// -------------------------------
// Edit Banner
// -------------------------------
async function editBanner(bannerId) {
  if (isSubmitting) return;

  isEditMode = true;
  currentBannerId = bannerId;

  try {
    const { data: banner } = await axios.get(`/admin/banners/${bannerId}`);

    document.getElementById("modalTitle").textContent = "Edit Banner";
    document.getElementById("submitBtnText").textContent = "Update Banner";
    document.getElementById("bannerId").value = bannerId;

    document.getElementById("title").value = banner.title || "";
    document.getElementById("description").value = banner.description || "";
    document.getElementById("ctaText").value = banner.ctaText || "Shop Now";
    document.getElementById("link").value = banner.link || "";
    document.getElementById("isActive").value = banner.isActive.toString();

    const formatDT = (d) => {
      const date = new Date(d);
      return `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-${String(date.getDate()).padStart(
        2,
        "0"
      )}T${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes()
      ).padStart(2, "0")}`;
    };

    document.getElementById("startDate").value = formatDT(banner.startDate);
    document.getElementById("endDate").value = formatDT(banner.endDate);

    if (banner.image) {
      const preview = document.getElementById("imagePreview");
      preview.classList.add("has-image");
      preview.innerHTML = `<img src="${banner.image}" alt="Banner">`;
    }

    showModal();
  } catch (err) {
    showToast(
      err.response?.data?.message || "Failed to load banner details",
      "error"
    );
  }
}

// -------------------------------
// Toggle Status
// -------------------------------
async function toggleBannerStatus(bannerId) {
  if (isSubmitting) return;

  try {
    await axios.patch(`/admin/banners/${bannerId}/toggle`);
    showToast("Banner status updated successfully");
    window.location.reload();
  } catch (err) {
    showToast(
      err.response?.data?.message || "Failed to update banner status",
      "error"
    );
  }
}

// -------------------------------
// Delete Banner
// -------------------------------
async function deleteBanner(bannerId) {
  if (isSubmitting) return;

  try {
    await axios.delete(`/admin/banners/${bannerId}`);
    showToast("Banner deleted successfully");
    window.location.reload();
  } catch (err) {
    showToast(
      err.response?.data?.message || "Failed to delete banner",
      "error"
    );
  }
}

// -------------------------------
// DOM EVENTS
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bannerForm");

  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.classList.contains("btn-edit")) {
      editBanner(btn.dataset.id);
    }

    if (
      btn.classList.contains("btn-toggle-on") ||
      btn.classList.contains("btn-toggle-off")
    ) {
      toggleBannerStatus(btn.dataset.id);
    }

    if (btn.classList.contains("btn-delete")) {
      deleteBanner(btn.dataset.id);
    }
  });
  // Image preview click → open file picker
const preview = document.getElementById("imagePreview");
const fileInput = document.getElementById("bannerImage");

if (preview && fileInput) {
  preview.addEventListener("click", () => {
    if (!isSubmitting) {
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", (e) => previewImage(e.target));
}


  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    isSubmitting = true;
    setSubmitButton(true, isEditMode ? "Updating..." : "Creating...");

    try {
      const formData = new FormData(form);

      if (!isEditMode && !formData.get("bannerImage")?.name) {
        throw new Error("Banner image is required");
      }

      const start = new Date(formData.get("startDate"));
      const end = new Date(formData.get("endDate"));
      if (end <= start) {
        throw new Error("End date must be after start date");
      }

      const url = isEditMode
        ? `/admin/banners/${currentBannerId}`
        : "/admin/banners";

      await axios({
        method: isEditMode ? "put" : "post",
        url,
        data: formData,
      });

      showToast(
        isEditMode ? "Banner updated successfully!" : "Banner created successfully!"
      );
      closeBannerModal();
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((msg) =>
          showToast(msg, "error")
        );
      } else {
        showToast(err.message || "Failed to save banner", "error");
      }
    } finally {
      isSubmitting = false;
      setSubmitButton(false, isEditMode ? "Update Banner" : "Create Banner");
    }
  });
});

// -------------------------------
// Expose Globals
// -------------------------------
window.openAddBannerModal = openAddBannerModal;
window.closeBannerModal = closeBannerModal;
window.editBanner = editBanner;
window.toggleBannerStatus = toggleBannerStatus;
window.deleteBanner = deleteBanner;
window.previewImage = previewImage;
