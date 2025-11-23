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
  const editForm = document.getElementById("editProductForm");
  const productId = editForm.dataset.id;
  const imageInput = document.getElementById("imageInput");
  const previewContainer = document.getElementById("previewContainer");
  const deletedImagesInput = document.getElementById("deletedImages");
  const cropModal = document.getElementById("cropModal");
  const cropImage = document.getElementById("cropImage");
  const cropSave = document.getElementById("cropSave");
  const cancelCrop = document.getElementById("cancelCrop");
  const submitBtn = editForm.querySelector("button[type='submit']");
  const addVariantBtn = document.getElementById("addVariantBtn");
  const variantContainer = document.getElementById("variantContainer");

  let deletedImages = [];
  let cropQueue = [];
  let croppedFiles = [];
  let currentIndex = 0;
  let cropper;
  let deletedVariantIds = [];


  // 🗑 CROSS MARK DELETE 
  previewContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-img-btn")) {
      const box = e.target.closest(".preview-box");
      const imgUrl = e.target.dataset.url; // will exist only for old images

      // If existing image (has URL), mark for backend deletion
      if (imgUrl) {
        deletedImages.push(imgUrl);
        deletedImagesInput.value = JSON.stringify(deletedImages);
        showToast("🗑 Existing image marked for deletion", "warning");
      }

      //  If new cropped image (no URL), remove from memory
      const index = Array.from(previewContainer.children).indexOf(box);
      if (index >= 0 && !imgUrl) {
        croppedFiles.splice(index - deletedImages.length, 1);
      }

      // Remove visually
      box.remove();
    }
  });

  //  CROP NEW IMAGES
  imageInput.addEventListener("change", (e) => {
    cropQueue = Array.from(e.target.files);
    currentIndex = 0;
    if (cropQueue.length > 0) openCropper();
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
    const box = document.createElement("div");
    box.classList.add("preview-box");
    const img = document.createElement("img");
    img.src = URL.createObjectURL(croppedFile);
    img.classList.add("preview-img");

    const delBtn = document.createElement("button");
    delBtn.classList.add("delete-img-btn");
    delBtn.innerHTML = "❌";
    delBtn.title = "Remove image";

    box.appendChild(img);
    box.appendChild(delBtn);
    previewContainer.appendChild(box);

    cropper.destroy();
    cropModal.style.display = "none";
    currentIndex++;

    if (currentIndex < cropQueue.length) openCropper();
  });

  cancelCrop.addEventListener("click", () => {
    cropModal.style.display = "none";
    if (cropper) cropper.destroy();
    currentIndex++;
    if (currentIndex < cropQueue.length) openCropper();
  });

  // ADD VARIANT
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

  // 🗑 REMOVE VARIANT ROW
 document.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-variant")) {
    const row = e.target.closest(".variant-row");

    const id = row.querySelector("[name='variantIds']")?.value;
    if (id) {
      deletedVariantIds.push(id); // store variant id to delete in backend
    }

    row.remove();
  }
});

  //  PATCH SUBMIT
editForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(editForm);

  // Force all variant rows to be included, even empty ones
  const variantRows = document.querySelectorAll(".variant-row");
  formData.delete("quantityValue[]");
  formData.delete("quantityType[]");
  formData.delete("regularPrice[]");
  formData.delete("salePrice[]");
  formData.delete("stock[]");

  variantRows.forEach((row) => {
  const qVal = row.querySelector("[name='quantityValue[]']").value.trim();
  const qType = row.querySelector("[name='quantityType[]']").value.trim();
  const regP = row.querySelector("[name='regularPrice[]']").value.trim();
  const saleP = row.querySelector("[name='salePrice[]']").value.trim();
  const stock = row.querySelector("[name='stock[]']").value.trim();
  const id = row.querySelector("[name='variantIds']")?.value;

  formData.append("quantityValue[]", qVal);
  formData.append("quantityType[]", qType);
  formData.append("regularPrice[]", regP);
  formData.append("salePrice[]", saleP);
  formData.append("stock[]", stock);
  formData.append("variantIds", id || "");

});

 formData.append("deletedVariantIds", JSON.stringify(deletedVariantIds));
  croppedFiles.forEach((f) => formData.append("images", f));

  submitBtn.disabled = true;
  submitBtn.textContent = "Updating...";

  try {
    const res = await axios.patch(`/admin/products/${productId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (res.data.success) {
      showToast("Product updated successfully!", "success");
      setTimeout(() => (window.location.href = res.data.redirectUrl), 1200);
    } else {
      const msg = Array.isArray(res.data.message)
        ? res.data.message[0]
        : res.data.message;
      showToast(msg || "Update failed", "error");
    }
  } catch (err) {
    console.error(" Update error:", err);
    const msg = err.response?.data?.message?.[0] || "Server error";
    showToast(msg, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Update Product";
  }
});

  
});
