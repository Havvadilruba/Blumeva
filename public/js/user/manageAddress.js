document.getElementById("openAddModalBtn").addEventListener("click", () => {
  document.getElementById("addressModal").style.display = "flex";
  document.getElementById("modalTitle").innerText = "Add Address";
  document.getElementById("addressForm").reset();
  document.getElementById("addressId").value = "";
});

// CLOSE MODAL
function closeModal() {
  document.getElementById("addressModal").style.display = "none";
}

// SAVE ADDRESS (Add / Update)
document.getElementById("saveBtn").addEventListener("click", async () => {
  const addressId = document.getElementById("addressId").value;

  const payload = {
    addressType: document.getElementById("addressType").value,
    fullName: document.getElementById("fullName").value,
    phone: document.getElementById("phone").value,
    address1: document.getElementById("address1").value,
    address2: document.getElementById("address2").value,
    city: document.getElementById("city").value,
    state: document.getElementById("state").value,
    pincode: document.getElementById("pincode").value,
    country: document.getElementById("country").value,
    setDefault: document.getElementById("setDefault").checked
  };

  try {
    const url = addressId ? `/address/${addressId}` : "/address";
    const method = addressId ? "patch" : "post";
    const res = await axios[method](url, payload);

    Toastify({
      text: res.data.message,
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: "#28a745" }
    }).showToast();

    setTimeout(() => location.reload(), 1200);

  } catch (err) {
    Toastify({
      text: err.response?.data?.message || "Something went wrong",
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: "#ff4d4d" }
    }).showToast();
  }
});

// EDIT ADDRESS MODAL
function openEditModal(addressJson) {
  const address = JSON.parse(addressJson);

  document.getElementById("addressModal").style.display = "flex";
  document.getElementById("modalTitle").innerText = "Edit Address";

  document.getElementById("addressId").value = address._id;
  document.getElementById("addressType").value = address.addressType;
  document.getElementById("fullName").value = address.fullName;
  document.getElementById("phone").value = address.phone;
  document.getElementById("address1").value = address.address1;
  document.getElementById("address2").value = address.address2 || "";
  document.getElementById("city").value = address.city;
  document.getElementById("state").value = address.state;
  document.getElementById("pincode").value = address.pincode;
  document.getElementById("country").value = address.country;
  document.getElementById("setDefault").checked = address.setDefault;
}

// DELETE ADDRESS
async function deleteAddress(id) {
  if (!confirm("Are you sure you want to delete this address?")) return;

  try {
    const res = await axios.delete(`/address/${id}`);

    Toastify({
      text: res.data.message,
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: "#d9534f" }
    }).showToast();

    setTimeout(() => location.reload(), 1200);

  } catch (err) {
    Toastify({
      text: "Failed to delete address",
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: "#ff4d4d" }
    }).showToast();
  }
}

// SET DEFAULT
async function setDefault(id) {
  try {
    const res = await axios.patch(`/address/set-default/${id}`);

    Toastify({
      text: res.data.message,
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: "#1d4ed8" }
    }).showToast();

    setTimeout(() => location.reload(), 1200);

  } catch (err) {
    Toastify({
      text: "Unable to set as default",
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: "#ff4d4d" }
    }).showToast();
  }
}

