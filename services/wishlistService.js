import { 
  fetchWishlistItems,
  getWishlistItemsCount,
  createWishlistItem, 
  removeWishlistItem, 
  checkInWishlist, 
  clearWishlist 
} from "../repositories/wishlistRepository.js";

import {
  getAvailableProductOffers,
  getAvailableCategoryOffers
} from "../repositories/offerRepository.js";
import { addToWishlistSchema } from "../validations/wishlistValidation.js";
import { getAppliedOffer } from "../helpers/product.helper.js"; 
import { findUserById } from "../repositories/userRepository.js";
import { findVariantByIdWithProduct } from "../repositories/productRepository.js";
import {findCartItemRepo  } from "../repositories/cartRepository.js";
import { findBrandById } from "../repositories/brandRepository.js";
import { findCategoryById } from "../repositories/CategoryRepository.js";

export const getWishlistData = async (userId, queryParams) => {
  const currentPage = parseInt(queryParams.page) || 1;
  const limit = 6;
  const skip = (currentPage - 1) * limit;
  const totalDocuments = await getWishlistItemsCount(userId);
  const totalPages = Math.ceil(totalDocuments / limit);

  let wishlist = await fetchWishlistItems(userId, limit, skip);

  const now = new Date();
  const productOffers = await getAvailableProductOffers(now);
  const categoryOffers = await getAvailableCategoryOffers(now);

  if (wishlist.length > 0) {
    wishlist[0].items = wishlist[0].items.map((item) => {
  const categoryOffer = categoryOffers.filter(
    (offer) => offer.categoryID?.toString() === item.category?._id?.toString()
  );

  const productOffer = productOffers.filter((offer) =>
    offer.productID.map((id) => id.toString()).includes(item.product._id.toString())
  );
  return {
    ...item,
  };
});
  }

  const user = await findUserById(userId);

  return {
    user,
    wishlist: wishlist[0] || { items: [] },
    totalDocuments,
    limit,
    totalPages,
    currentPage,
  };
};

export const toggleWishlistItem = async (userId, variantId) => {
  // Validate request
  const { error } = addToWishlistSchema.validate({ variantId });
  if (error) {
    return { success: false, message: error.details[0].message };
  }

  // Check variant + product availability
  const variant = await findVariantByIdWithProduct(variantId);
  if (!variant) {
    return { success: false, message: "Product not found" };
  }

  const brand = await findBrandById(variant.productId.brand);
  const category = await findCategoryById(variant.productId.category);

  if (!brand?.status || !category?.isListed || variant.productId.isBlocked) {
    return { success: false, message: "Product is not available" };
  }

  // Check in wishlist
  const inWishlist = await checkInWishlist(
    userId,
    variant.productId._id,
    variantId
  );

  if (inWishlist) {
    await removeWishlistItem(userId, variant.productId._id, variantId);

    const newCount = await getWishlistItemsCount(userId);
    return {
      success: true,
      action: "removed",
      message: "Product removed from wishlist",
      itemCount: newCount
    };
  }



  // Add to wishlist
  await createWishlistItem(userId, variant.productId._id, variantId);

  const newCount = await getWishlistItemsCount(userId);

  return {
    success: true,
    action: "added",
    message: "Product added to wishlist",
    itemCount: newCount
  };
};

export const clearUserWishlist = async (userId) => {
  await clearWishlist(userId);
  return {
    success: true,
    message: "Wishlist cleared successfully",
  };
};

export const checkWishlistStatus = async (userId, productId, variantId) => {
  const inWishlist = await checkInWishlist(userId, productId, variantId);

  return {
    success: true,
    inWishlist: !!inWishlist,
  };
};


