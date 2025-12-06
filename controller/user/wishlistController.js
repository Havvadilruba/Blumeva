import {
   getWishlistData,
   toggleWishlistItem, 
   clearUserWishlist,
   checkWishlistStatus
   } from "../../services/wishlistService.js";

// Load Wishlist Page
export const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const data = await getWishlistData(userId, req.query);

    res.render("user/wishlist", {
      layout: "layouts/user",
      title: "My Wishlist | Blumeva",
      pageCSS: "/style/user/wishlist.css",
      ...data,
    });
  } catch (error) {
    console.error("Error loading wishlist:", error);
    res.redirect("/pageNotFound");
  }
};

// Toggle Wishlist (Add/Remove)
export const toggleWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { variantId } = req.body;

    const result = await toggleWishlistItem(userId, variantId);

    return res.json(result);
  } catch (error) {
    console.error("Error toggling wishlist:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// Clear Wishlist
export const clearWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const result = await clearUserWishlist(userId);

    return res.json(result);
  } catch (error) {
    console.error("Error clearing wishlist:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// Check if item is in wishlist
export const checkWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { variantId } = req.params;

    const result = await checkWishlistStatus(userId, variantId);

    return res.json(result);
  } catch (error) {
    console.error("Error checking wishlist:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export default {
  loadWishlist,
  toggleWishlist,
  clearWishlist,
  checkWishlist,
};
