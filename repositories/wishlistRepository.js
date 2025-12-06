import mongoose from "mongoose";
import Wishlist from "../model/wishlistSchema.js";
import Variant from "../model/variantSchema.js";


export const fetchWishlistItems = (userId, limit, skip) => {
  return Wishlist
    .find({ userId }, { items: { $slice: [skip, limit] } })
    .populate({
      path: "items.productId",
      populate: { path: "brand category" },
    })
    .populate("items.variantId");
};

export const getWishlistItemsCount = async (userId) => {
  const result = await Wishlist.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $project: {
        totalItems: { $size: "$items" },
        _id: 0,
      },
    },
  ]);
  return result[0]?.totalItems || 0;
};

export const createWishlistItem = (userId, productId, variantId) => {
  return Wishlist.findOneAndUpdate(
    { userId },
    {
      $addToSet: {
        items: { productId, variantId },
      },
    },
    { upsert: true, new: true }
  );
};

export const removeWishlistItem = (userId,productId, variantId) => {
  return Wishlist.findOneAndUpdate(
    { userId },
    {
      $pull: {
        items: { productId,variantId },
      },
    },
    { new: true }
  );
};

export const checkInWishlist = (userId, productId,variantId) => {
  return Wishlist.findOne({
    userId,
    items: {
      $elemMatch: { variantId ,productId},
    },
  });
};

export const clearWishlist = (userId) => {
  return Wishlist.deleteOne({ userId });
};

