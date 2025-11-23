import Address from "../../model/addressSchema.js";
import { addressSchema } from "../../validations/addressValidation.js";

// Load Manage Address Page
const loadManageAddress = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const addresses = await Address.find({ userId }).sort({ createdAt: -1 });

    res.render("user/manageAddress", {
      activePage: "manage-address",
      addresses,
      layout: "layouts/user",
      title: "Manage Address",
      pageCSS: "/style/user/manageAddress.css"
    });
  } catch (error) {
    console.log("Load Manage Address Error:", error);
    res.redirect("/pageNotFound");
  }
};

// Add Address
const addAddress = async (req, res) => {
  try {
    const { error } = addressSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const userId = req.session.user._id;
    const addressData = { ...req.body, userId };

    if (req.body.setDefault) {
      await Address.updateMany({ userId }, { $set: { setDefault: false } });
    } else {
      const existsDefault = await Address.findOne({ userId, setDefault: true });
      if (!existsDefault) addressData.setDefault = true;
    }

    await Address.create(addressData);

    return res.status(200).json({
      success: true,
      message: "Address added successfully",
    });

  } catch (error) {
    console.log("Add Address Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add address",
    });
  }
};

// Update Address
const updateAddress = async (req, res) => {
  try {
    const { error } = addressSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const userId = req.session.user._id;
    const existingAddress = await Address.findById(req.params.id);
    if (!existingAddress) {
      return res.status(400).json({
        success: false,
        message: "Address not found",
      });
    }

    let updatedData = { ...req.body, userId };

    if (req.body.setDefault) {
      await Address.updateMany({ userId }, { $set: { setDefault: false } });
    } else if (existingAddress.setDefault) {
      updatedData.setDefault = true;
    }

    await Address.findByIdAndUpdate(req.params.id, updatedData);

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
    });

  } catch (error) {
    console.log("Update Address Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update address",
    });
  }
};

// Delete Address
const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const address = await Address.findById(req.params.id);

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Address not found",
      });
    }

    // If deleting default, assign another as default
    if (address.setDefault) {
      const anotherAddress = await Address.findOne({
        userId,
        _id: { $ne: req.params.id }
      }).sort({ createdAt: -1 });

      if (anotherAddress) {
        await Address.findByIdAndUpdate(anotherAddress._id, { setDefault: true });
      }
    }

    await Address.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });

  } catch (error) {
    console.log("Delete Address Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete address",
    });
  }
};

// Set Default Address Only
const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.session.user._id;

    await Address.updateMany({ userId }, { $set: { setDefault: false } });
    await Address.findByIdAndUpdate(req.params.id, { setDefault: true });

    return res.status(200).json({
      success: true,
      message: "Default address updated",
    });

  } catch (error) {
    console.log("Default Address Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to set default address",
    });
  }
};

export default {
  loadManageAddress,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
