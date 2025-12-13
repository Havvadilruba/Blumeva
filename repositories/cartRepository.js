// repositories/cartRepository.js
import Cart from "../model/cartSchema.js";
import mongoose from "mongoose";

export const getCartItemsRepo = async (userId) => {
  return Cart.aggregate([
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
          salePrice: "$variant.salePrice"
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
          {
            $project: {
              offer: {
                $cond: {
                  if: { $eq: ["$discountType", "percentage"] },
                  then: { $multiply: ["$$salePrice", "$discountValue", 0.01] },
                  else: "$discountValue"
                }
              }
            }
          },
          { $sort: { offer: -1 } },
          { $limit: 1 }
        ],
        as: "productOffer"
      }
    },
    { $unwind: { path: "$productOffer", preserveNullAndEmptyArrays: true } },

    /** CATEGORY OFFER */
    {
      $lookup: {
        from: "offers",
        let: {
          categoryId: "$category._id",
          today: new Date(),
          salePrice: "$variant.salePrice"
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
          {
            $project: {
              offer: {
                $cond: {
                  if: { $eq: ["$discountType", "percentage"] },
                  then: { $multiply: ["$$salePrice", "$discountValue", 0.01] },
                  else: "$discountValue"
                }
              }
            }
          },
          { $sort: { offer: -1 } },
          { $limit: 1 }
        ],
        as: "categoryOffer"
      }
    },
    { $unwind: { path: "$categoryOffer", preserveNullAndEmptyArrays: true } },

    /** FINAL DISCOUNT */
    {
      $addFields: {
        productOfferAmount: { $ifNull: ["$productOffer.offer", 0] },
        categoryOfferAmount: { $ifNull: ["$categoryOffer.offer", 0] }
      }
    },
    {
      $addFields: {
        discountAmount: {
          $ceil: {
            $max: ["$productOfferAmount", "$categoryOfferAmount"]
          }
        }
      }
    },

    /** Final returning fields */
    {
      $addFields: {
        stock: "$variant.stock",
        regularPrice: "$variant.regularPrice",
        salePrice: "$variant.salePrice",
        images: "$product.images"
      }
    }
  ]);
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

