import mongoose from "mongoose";
import Wishlist from "../model/wishlistSchema.js";



export const fetchWishlistItems = (userId, limit, skip) => {
  return Wishlist.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },

    // Slice only needed data → Performance!
    { $project: { items: { $slice: ["$items", skip, limit] } } },

    // Item level processing
    { $unwind: "$items" },

    // Lookup Variant
    {
      $lookup: {
        from: "variants",
        localField: "items.variantId",
        foreignField: "_id",
        as: "variant"
      }
    },
    { $unwind: "$variant" },

    // Lookup Product
    {
      $lookup: {
        from: "products",
        localField: "variant.productId",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" },

    // Filter unavailable items (blocked product / inactive brand / unlisted category)
    { $match: { "product.isBlocked": false } },

    // Join Brand
    {
      $lookup: {
        from: "brands",
        localField: "product.brand",
        foreignField: "_id",
        as: "brand"
      }
    },
    { $unwind: "$brand" },
    { $match: { "brand.status": true } },

    // Join Category
    {
      $lookup: {
        from: "categories",
        localField: "product.category",
        foreignField: "_id",
        as: "category"
      }
    },
    { $unwind: "$category" },
    { $match: { "category.isListed": true } },

    // Final result shaping
    {
      $project: {
        _id: 0,
        items: {
          product: "$product",
          variant: "$variant",
          brand: "$brand",
          category: "$category",
          addedAt: "$items.addedAt"
        }
      }
    },

    // Group back
    {
      $group: {
        _id: null,
        items: { $push: "$items" }
      }
    }
  ]);
};


export const getWishlistItemsCount = async (userId) => {
  const result = await Wishlist.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $project: { totalItems: { $size: "$items" }, _id: 0 } }
  ]);

  return result[0]?.totalItems || 0;
};



// Add item
export const createWishlistItem = (userId, productId, variantId) => {
  return Wishlist.findOneAndUpdate(
    { userId },
    { $addToSet: { items: { productId, variantId } } },
    { upsert: true, new: true }
  );
};


// Remove item
export const removeWishlistItem = (userId, productId, variantId) => {
  return Wishlist.findOneAndUpdate(
    { userId },
    { $pull: { items: { productId, variantId } } },
    { new: true }
  );
};


// 👉 Missing export added back
export const checkInWishlist = (userId, productId, variantId) => {
  return Wishlist.findOne({
    userId,
    items: { $elemMatch: { productId, variantId } }
  });
};


// Clear wishlist
export const clearWishlist = (userId) => {
  return Wishlist.deleteOne({ userId });
};


