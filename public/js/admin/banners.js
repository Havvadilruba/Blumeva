// ===============================
// Banner Management JavaScript
// ===============================

let isEditMode = false;
let currentBannerId = null;
let isSubmitting = false; // Prevent double submissions

// -------------------------------
// Modal Helpers
// -------------------------------
function showModal() {
  const modal = document.getElementById('bannerModal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
}

function hideModal() {
  const modal = document.getElementById('bannerModal');
  modal.classList.remove('show');
  setTimeout(() => (modal.style.display = 'none'), 300);
}

function openAddBannerModal() {
  isEditMode = false;
  currentBannerId = null;

  document.getElementById('modalTitle').textContent = 'Add New Banner';
  document.getElementById('submitBtnText').textContent = 'Create Banner';
  document.getElementById('bannerForm').reset();
  document.getElementById('bannerId').value = '';

  const preview = document.getElementById('imagePreview');
  preview.classList.remove('has-image');
  preview.innerHTML = `
    <i class="bi bi-image"></i>
    <span>Click to upload banner image</span>
  `;

  showModal();
}

function closeBannerModal() {
  if (isSubmitting) {
    return; // Don't close while submitting
  }
  hideModal();
  document.getElementById('bannerForm').reset();
}

// -------------------------------
// Loading State Helpers
// -------------------------------
function setSubmitButton(loading, text) {
  const btn = document.getElementById('submitBtn');
  const btnText = document.getElementById('submitBtnText');
  
  if (loading) {
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'not-allowed';
    btnText.innerHTML = `<i class="bi bi-hourglass-split"></i> ${text}`;
  } else {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    btnText.innerHTML = text;
  }
}

// -------------------------------
// Image Preview
// -------------------------------
function previewImage(input) {
  const preview = document.getElementById('imagePreview');

  if (input.files && input.files[0]) {
    const file = input.files[0];
    
    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      input.value = '';
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      preview.classList.add('has-image');
      preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
  }
}

// -------------------------------
// Edit Banner
// -------------------------------
async function editBanner(bannerId) {
  if (isSubmitting) return;

  isEditMode = true;
  currentBannerId = bannerId;

  try {
    const res = await axios.get(`/admin/banners/${bannerId}`);
    const banner = res.data;

    document.getElementById('modalTitle').textContent = 'Edit Banner';
    document.getElementById('submitBtnText').textContent = 'Update Banner';
    document.getElementById('bannerId').value = bannerId;

    document.getElementById('title').value = banner.title || '';
    document.getElementById('description').value = banner.description || '';
    document.getElementById('ctaText').value = banner.ctaText || 'Shop Now';
    document.getElementById('link').value = banner.link || '';
    document.getElementById('isActive').value = banner.isActive.toString();

    const formatDT = (d) => {
      const date = new Date(d);
      return `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(
        date.getHours()
      ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    document.getElementById('startDate').value = formatDT(banner.startDate);
    document.getElementById('endDate').value = formatDT(banner.endDate);

    if (banner.image) {
      const preview = document.getElementById('imagePreview');
      preview.classList.add('has-image');

      let imageUrl = banner.image;
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        imageUrl = imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl;
      }

      preview.innerHTML = `<img src="${imageUrl}" alt="Banner" onerror="handleImageError(this)">`;
    }

    showModal();
  } catch (err) {
    console.error('Error loading banner:', err);
    alert('Failed to load banner details: ' + (err.response?.data?.message || err.message));
  }
}

// -------------------------------
// Image Error Handler
// -------------------------------
function handleImageError(img) {
  console.error('Failed to load image:', img.src);
  const preview = document.getElementById('imagePreview');
  preview.innerHTML = `
    <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: #dc3545;"></i>
    <span style="color: #dc3545;">Failed to load image</span>
    <small style="color: #6c757d;">The image may have been deleted or moved</small>
  `;
}

// -------------------------------
// Toggle Status
// -------------------------------
async function toggleBannerStatus(bannerId, currentStatus) {
  if (isSubmitting) return;

  const confirmed = confirm(
    currentStatus
      ? 'Deactivate this banner?'
      : 'Activate this banner?'
  );

  if (!confirmed) return;

  try {
    const res = await axios.patch(`/admin/banners/${bannerId}/toggle`);
    if (res.status === 200) {
      alert('Banner status updated');
      window.location.reload();
    }
  } catch (err) {
    console.error('Error toggling banner status:', err);
    alert('Failed to update banner status: ' + (err.response?.data?.message || err.message));
  }
}

// -------------------------------
// Delete Banner
// -------------------------------
async function deleteBanner(bannerId) {
  if (isSubmitting) return;

  const confirmed = confirm(
    'This banner will be permanently deleted. Continue?'
  );
  if (!confirmed) return;

  try {
    const res = await axios.delete(`/admin/banners/${bannerId}`);
    if (res.status === 200) {
      alert('Banner deleted successfully');
      window.location.reload();
    }
  } catch (err) {
    console.error('Error deleting banner:', err);
    alert('Failed to delete banner: ' + (err.response?.data?.message || err.message));
  }
}

// -------------------------------
// DOM EVENTS
// -------------------------------
document.addEventListener('DOMContentLoaded', () => {
  console.log('Banner management script loaded');

  // Event delegation for action buttons
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('btn-edit')) {
      e.preventDefault();
      editBanner(btn.dataset.id);
    }

    if (
      btn.classList.contains('btn-toggle-on') ||
      btn.classList.contains('btn-toggle-off')
    ) {
      e.preventDefault();
      const currentStatus = btn.classList.contains('btn-toggle-off');
      toggleBannerStatus(btn.dataset.id, currentStatus);
    }

    if (btn.classList.contains('btn-delete')) {
      e.preventDefault();
      deleteBanner(btn.dataset.id);
    }
  });

  // Image preview click
  const preview = document.getElementById('imagePreview');
  const fileInput = document.getElementById('bannerImage');
  if (preview && fileInput) {
    preview.addEventListener('click', () => {
      if (!isSubmitting) {
        fileInput.click();
      }
    });
    fileInput.addEventListener('change', (e) => previewImage(e.target));
  }

  // Form Submit
  const form = document.getElementById('bannerForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Prevent double submission
      if (isSubmitting) {
        console.log('Already submitting, please wait...');
        return;
      }

      try {
        isSubmitting = true;
        setSubmitButton(true, isEditMode ? 'Updating...' : 'Creating...');

        const formData = new FormData(form);

        // Validation
        if (!isEditMode && !formData.get('bannerImage').name) {
          alert('Banner image is required');
          return;
        }

        const start = new Date(formData.get('startDate'));
        const end = new Date(formData.get('endDate'));

        if (end <= start) {
          alert('End date must be after start date');
          return;
        }

        const url = isEditMode
          ? `/admin/banners/${currentBannerId}`
          : '/admin/banners';

        const method = isEditMode ? 'put' : 'post';

        console.log(`Submitting banner (${method}):`, url);

        const res = await axios({
          method,
          url,
          data: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (res.status === 200 || res.status === 201) {
          alert(isEditMode ? 'Banner updated successfully!' : 'Banner created successfully!');
          closeBannerModal();
          
          // Reload after a short delay to show the success message
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      } catch (err) {
        console.error('Error saving banner:', err);
        
        // Better error messages
        let errorMessage = 'Failed to save banner';
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response?.data?.errors) {
          errorMessage = err.response.data.errors.join('\n');
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        alert(errorMessage);
      } finally {
        isSubmitting = false;
        setSubmitButton(false, isEditMode ? 'Update Banner' : 'Create Banner');
      }
    });
  }

  // Close modal on backdrop click
  window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('bannerModal') && !isSubmitting) {
      closeBannerModal();
    }
  });

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !isSubmitting) {
      closeBannerModal();
    }
  });
});

// -------------------------------
// Expose Globals (for inline use)
// -------------------------------
window.openAddBannerModal = openAddBannerModal;
window.closeBannerModal = closeBannerModal;
window.editBanner = editBanner;
window.toggleBannerStatus = toggleBannerStatus;
window.deleteBanner = deleteBanner;
window.previewImage = previewImage;
window.handleImageError = handleImageError;