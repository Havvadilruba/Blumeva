import { 
  fetchWishlistItems,
  getWishlistItemsCount,
  createWishlistItem, 
  removeWishlistItem, 
  checkInWishlist, 
  clearWishlist 
} from "../repositories/wishlistRepository.js";

export const getWishlistData = async (userId, queryParams) => {
  const currentPage = parseInt(queryParams.page) || 1;
  const limit = 6;
  const skip = (currentPage - 1) * limit;
  const totalDocuments = await getWishlistItemsCount(userId);
  const totalPages = Math.ceil(totalDocuments / limit);
  const wishlist = await fetchWishlistItems(userId, limit, skip);

  return {
    wishlist: wishlist[0] || { items: [] },
    totalDocuments,
    limit,
    totalPages,
    currentPage,
  };
};

export const toggleWishlistItem = async (userId, variantId) => {
  if (!variantId) {
    return {
      success: false,
      message: "Variant ID is required",
    };
  }

  // Check if already in wishlist
  const inWishlist = await checkInWishlist(userId, variantId);

  if (inWishlist) {
    // Remove from wishlist
    await removeWishlistItem(userId, variantId);
    return {
      success: true,
      action: "removed",
      message: "Product removed from wishlist",
    };
  }

  // Get variant with product details
  const Variant = (await import("../model/variantSchema.js")).default;
  const variant = await Variant.findById(variantId).populate("productId");

  if (!variant) {
    return {
      success: false,
      message: "Product not found",
    };
  }

  if (!variant.isAvailable || variant.productId.isBlocked) {
    return {
      success: false,
      message: "Product is not available",
    };
  }

  // Add to wishlist
  await createWishlistItem(userId, variant.productId._id, variantId);

  return {
    success: true,
    action: "added",
    message: "Product added to wishlist",
  };
};

export const clearUserWishlist = async (userId) => {
  await clearWishlist(userId);
  return {
    success: true,
    message: "Wishlist cleared successfully",
  };
};

export const checkWishlistStatus = async (userId, variantId) => {
  const inWishlist = await checkInWishlist(userId, variantId);
  return {
    success: true,
    inWishlist: !!inWishlist,
  };
};

