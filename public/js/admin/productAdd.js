function showToast(message, type = "info", duration = 2500) {
  const colors = {
    success: "#4CAF50",
    error: "#e74c3c",
    warning: "#f39c12",
    info: "#3498db",
  };
  Toastify({
    text: message,
    backgroundColor: colors[type] || colors.info,
    duration,
    gravity: "top",
    position: "right",
    close: true,
    stopOnFocus: true,
  }).showToast();
}

document.addEventListener("DOMContentLoaded", () => {
  const productForm = document.getElementById("productForm");
  const imageInput = document.getElementById("imageInput");
  const previewContainer = document.getElementById("previewContainer");
  const cropModal = document.getElementById("cropModal");
  const cropImage = document.getElementById("cropImage");
  const cropSave = document.getElementById("cropSave");
  const cancelCrop = document.getElementById("cancelCrop");
  const submitBtn = productForm.querySelector("button[type='submit']");

  let cropper;
  let cropQueue = [];
  let croppedFiles = [];
  let currentIndex = 0;
  let croppingInProgress = false;

  // IMAGE CROPPER

  imageInput.addEventListener("change", (e) => {
    cropQueue = Array.from(e.target.files);
    currentIndex = 0;

    if (cropQueue.length > 0) {
      croppingInProgress = true;
      openCropper();
    }
  });

  function openCropper() {
    const file = cropQueue[currentIndex];
    const reader = new FileReader();

    reader.onload = (event) => {
      cropImage.src = event.target.result;
      cropModal.style.display = "flex";

      setTimeout(() => {
        if (cropper) cropper.destroy();
        cropper = new Cropper(cropImage, {
          aspectRatio: 1,
          viewMode: 2,
          autoCropArea: 1,
          background: false,
        });
      }, 200);
    };
    reader.readAsDataURL(file);
  }

  cropSave.addEventListener("click", async () => {
    if (!cropper) return;

    const canvas = cropper.getCroppedCanvas({ width: 600, height: 600 });
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );
    const croppedFile = new File([blob], `cropped-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    croppedFiles.push(croppedFile);

    // Add preview
    const previewBox = document.createElement("div");
    previewBox.classList.add("preview-box");

    const img = document.createElement("img");
    img.src = URL.createObjectURL(croppedFile);
    img.classList.add("preview-img");

    const delBtn = document.createElement("button");
    delBtn.classList.add("delete-img-btn");
    delBtn.innerHTML = "&times;";

    delBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const index = Array.from(previewContainer.children).indexOf(previewBox);
      croppedFiles.splice(index, 1);
      previewBox.remove();
    });

    previewBox.appendChild(img);
    previewBox.appendChild(delBtn);
    previewContainer.appendChild(previewBox);

    cropper.destroy();
    cropModal.style.display = "none";
    currentIndex++;

    if (currentIndex < cropQueue.length) {
      openCropper();
    } else {
      croppingInProgress = false;
    }
  });

  cancelCrop.addEventListener("click", () => {
    cropModal.style.display = "none";
    if (cropper) cropper.destroy();
    currentIndex++;
    if (currentIndex < cropQueue.length) {
      openCropper();
    } else {
      croppingInProgress = false;
    }
  });
//  VARIANT ADD / REMOVE

const addVariantBtn = document.getElementById("addVariantBtn");
const variantContainer = document.getElementById("variantContainer");

// new variant 
addVariantBtn.addEventListener("click", () => {
  const row = document.createElement("div");
  row.classList.add("variant-row");

  row.innerHTML = `
    <input type="number" name="quantityValue[]" placeholder="Value (100)" />
    <select name="quantityType[]">
      <option value="ml">ml</option>
      <option value="g">g</option>
    </select>
    <input type="number" name="regularPrice[]" placeholder="Regular Price ₹" />
    <input type="number" name="salePrice[]" placeholder="Sale Price ₹" />
    <input type="number" name="stock[]" placeholder="Stock" />
    <button type="button" class="remove-variant">🗑</button>
  `;

  variantContainer.appendChild(row);
});

// Remove variant
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-variant")) {
    e.target.closest(".variant-row").remove();
  }
});

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();

  // append text fields manually (skip file input)
  const rawFormData = new FormData(productForm);
  rawFormData.forEach((value, key) => {
    if (key !== "images") {
      formData.append(key, value);
    }
  });

  // append ONLY cropped images
  croppedFiles.forEach((file) => {
    formData.append("images", file);
  });

  submitBtn.disabled = true;
  submitBtn.textContent = "Uploading...";

  try {
    const res = await axios.post("/admin/products/add", formData);

    if (res.data.success) {
      showToast("✅ Product added successfully!", "success");
      setTimeout(() => (window.location.href = res.data.redirectUrl), 1000);
    } else {
      showToast(res.data.message?.[0] || "Upload failed", "error");
    }
  } catch (err) {
    showToast(err.response?.data?.message?.[0] || "Server error", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save Product";
  }
});

});
