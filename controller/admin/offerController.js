import {
  addOfferService,
  deleteOfferService,
  editOfferService,
  getOfferByIdService,
  getOfferPageDataService,
  toggleOfferStatusService,
  searchProductsService,
} from "../../services/offerService.js";
import { offerSchema } from "../../validations/offerValidation.js";

/**
 * Load offers 
 */
const loadOffers = async (req, res) => {
  try {
    const offerType = req.query.type || "product";
    const searchQuery = req.query.search || "";
    const statusFilter = req.query.status || "";
    const sortFilter = req.query.sort || "recent";
    const currentPage = parseInt(req.query.page) || 1;

    const data = await getOfferPageDataService(
      offerType,
      searchQuery,
      statusFilter,
      sortFilter,
      currentPage
    );

    res.render("admin/offers", {
      layout: "layouts/admin",
      title: "Offers Management | Admin",
      pageCSS: "offers",
      activePage: "offers",
      ...data,
    });
  } catch (error) {
    console.error("Load offers error:", error);
    res.redirect("/admin/pageNotFound");
  }
};

/**
 * Search products
 */
const searchProducts = async (req, res) => {
  try {
    const query = req.query.q || "";

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const products = await searchProductsService(query);

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Search products error:", error.message);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Server error while searching products",
    });
  }
};

/**
 * Add new offer
 */
const addOffer = async (req, res) => {
  try {
    const { error } = offerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    await addOfferService(req.body);

    return res.status(200).json({
      success: true,
      message: "Offer created successfully",
    });
  } catch (error) {
    console.error("Add offer error:", error.message);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Server error while creating offer",
    });
  }
};

/**
 * Get offer by ID
 */
const getOfferById = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await getOfferByIdService(id);

    return res.status(200).json({
      success: true,
      offer,
    });
  } catch (error) {
    console.error("Get offer error:", error.message);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Server error while fetching offer",
    });
  }
};

/**
 * Edit existing offer
 */
const editOffer = async (req, res) => {
  try {
    const { error } = offerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { id } = req.params;
    await editOfferService(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Offer updated successfully",
    });
  } catch (error) {
    console.error("Edit offer error:", error.message);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Server error while updating offer",
    });
  }
};

/**
 * Toggle offer status
 */
const toggleOfferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    await toggleOfferStatusService(id);

    return res.status(200).json({
      success: true,
      message: "Offer status updated successfully",
    });
  } catch (error) {
    console.error("Toggle offer status error:", error.message);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Server error while updating status",
    });
  }
};

/**
 * Delete offer
 */
const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteOfferService(id);

    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    console.error("Delete offer error:", error.message);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Server error while deleting offer",
    });
  }
};

export default {
  loadOffers,
  searchProducts,
  addOffer,
  getOfferById,
  editOffer,
  toggleOfferStatus,
  deleteOffer,
};