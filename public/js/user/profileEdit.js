let cropper = null;
let croppedFile = null;

document.addEventListener("DOMContentLoaded", () => {
  const imageInput = document.getElementById("profileImageInput");
  const avatarPreview = document.getElementById("avatarPreview");
  const cropModal = document.getElementById("cropModal");
  const cropImage = document.getElementById("cropImage");
  const cropSave = document.getElementById("cropSave");
  const cancelCrop = document.getElementById("cancelCrop");
  const removePhotoBtn = document.getElementById("removePhotoBtn");
  const removePhotoInput = document.getElementById("removePhotoInput");
  const saveBtn = document.getElementById("saveBtn");
  const defaultAvatar = "/images/default-avatar.png";

  imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    removePhotoInput.value = "false"; // reset remove flag if new file selected

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
        });
      }, 100);
    };

    reader.readAsDataURL(file);
  });

  cropSave.addEventListener("click", async () => {
    const canvas = cropper.getCroppedCanvas({ width: 600, height: 600 });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));

    croppedFile = new File([blob], `profile-${Date.now()}.jpg`, { type: "image/jpeg" });

    avatarPreview.src = URL.createObjectURL(croppedFile);
    cropModal.style.display = "none";
    cropper.destroy();
  });

  cancelCrop.addEventListener("click", () => {
    cropModal.style.display = "none";
    cropper.destroy();
  });

  removePhotoBtn.addEventListener("click", () => {
    croppedFile = null;
    imageInput.value = "";
    removePhotoInput.value = "true";
    avatarPreview.src = defaultAvatar;
  });

  saveBtn.addEventListener("click", async () => {
    const form = document.getElementById("editProfileForm");
    const formData = new FormData(form);

    if (croppedFile) {
      formData.delete("profileImage");
      formData.append("profileImage", croppedFile);
    }

    try {
      await axios.patch("/profileEdit", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});

      Toastify({ text: "Profile Updated!", backgroundColor: "#4CAF50" }).showToast();
      setTimeout(() => location.href = "/profile", 1000);
    } catch (err) {
      console.log(err);
      Toastify({ text: "Update Failed", backgroundColor: "#E53935" }).showToast();
    }
  });
});
