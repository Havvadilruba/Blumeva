import mongoose from "mongoose";
import Wishlist from "../model/wishlistSchema.js";
import { getAppliedOffer } from "../helpers/offerHelper.js";

export const fetchWishlistItems = async (userId, limit, skip) => {
  const result = await Wishlist.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },

    { $project: { items: { $slice: ["$items", skip, limit] } } },


    { $unwind: "$items" },

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

    
    {
      $lookup: {
        from: "offers",
        let: {
          productId: "$product._id",
          today: new Date(),
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$offerType", "product"] },
                  { $in: ["$$productId", "$productID"] },
                  { $lte: ["$startDate", "$$today"] },
                  { $gte: ["$endDate", "$$today"] },
                  { $eq: ["$isActive", true] }
                ]
              }
            }
          },
        ],
        as: "productOffer"
      }
    },

   
    {
      $lookup: {
        from: "offers",
        let: {
          categoryId: "$category._id",
          today: new Date(),
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$offerType", "category"] },
                  { $eq: ["$$categoryId", "$categoryID"] },
                  { $lte: ["$startDate", "$$today"] },
                  { $gte: ["$endDate", "$$today"] },
                  { $eq: ["$isActive", true] }
                ]
              }
            }
          },
        ],
        as: "categoryOffer"
      }
    },

    // Final result shaping
    {
      $project: {
        _id: 0,
        items: {
          product: "$product",
          variant: "$variant",
          brand: "$brand",
          category: "$category",
          addedAt: "$items.addedAt",
          productOffer: "$productOffer",   
          categoryOffer: "$categoryOffer"  
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


  if (result.length > 0 && result[0].items) {
    result[0].items = result[0].items.map(item => ({
      ...item,
      discountAmount: getAppliedOffer(item, item.variant.salePrice)
    }));
  }

  return result;
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

// Check if item is in wishlist
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