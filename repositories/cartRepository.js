// repositories/cartRepository.js
import Cart from "../model/cartSchema.js";
import mongoose from "mongoose";

import { getAppliedOffer } from "../helpers/offerHelper.js";

export const getCartItemsRepo = async (userId) => {
  const cartItems = await Cart.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },

    {
      $lookup: {
        from: "variants",
        localField: "variantId",
        foreignField: "_id",
        as: "variant"
      }
    },
    { $unwind: "$variant" },

    {
      $lookup: {
        from: "products",
        localField: "variant.productId",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" },

    {
      $lookup: {
        from: "brands",
        localField: "product.brand",
        foreignField: "_id",
        as: "brand"
      }
    },
    { $unwind: "$brand" },

    {
      $lookup: {
        from: "categories",
        localField: "product.category",
        foreignField: "_id",
        as: "category"
      }
    },
    { $unwind: "$category" },

    {
      $match: {
        "product.isBlocked": false,
        "brand.status": true,
        "category.isListed": true
      }
    },

    /** PRODUCT OFFER */
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

    /** CATEGORY OFFER  */
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

    {
      $addFields: {
        stock: "$variant.stock",
        regularPrice: "$variant.regularPrice",
        salePrice: "$variant.salePrice",
        images: "$product.images"
      }
    }
  ]);


  const cartItemsWithOffers = cartItems.map(item => ({
    ...item,
    discountAmount: getAppliedOffer(item, item.salePrice)
  }));

  return cartItemsWithOffers;
};

export const findCartItemRepo = (userId, variantId) => {
  return Cart.findOne({ userId, variantId });
};

export const createCartItemRepo = (data) => {
  return Cart.create(data);
};

export const findCartByIdRepo = (cartItemId) => {
  return Cart.findById(cartItemId).populate("variantId");
};

export const updateCartItemQuantityRepo = (cartItemId, quantity) => {
  return Cart.findByIdAndUpdate(
    cartItemId,
    { $set: { quantity } },
    { new: true }
  ).populate("variantId");
};

export const removeCartItemRepo = (cartItemId, userId) => {
  return Cart.findOneAndDelete({ _id: cartItemId, userId });
};

export const getCartItemsCount = async (userId) => {
  const result = await Cart.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalQty: { $sum: "$quantity" }
      }
    }
  ]);

  return result[0]?.totalQty || 0;
};

