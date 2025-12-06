import Cart from "../model/cartSchema.js";
import mongoose from "mongoose";

// services/cartServices.js
export const getCartItems = async (userId) => {
  return await Cart.aggregate([
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

    // 🔥 PRODUCT OFFER
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
              _id: 0,
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

    // 🔥 CATEGORY OFFER
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
              _id: 0,
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

    // 🔥 SAME RULE EVERYWHERE (max offer)
    {
      $addFields: {
        discountAmount: {
          $ceil: {
            $cond: {
              if: { $gte: ["$categoryOffer.offer", "$productOffer.offer"] },
              then: "$categoryOffer.offer",
              else: "$productOffer.offer"
            }
          }
        }
      }
    },

    // Return same fields as other pages
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


export const calculateCartTotals = (items) => {
  let subtotal = 0;
  let discount = 0;

  items.forEach(item => {
    const stock = item.stock || 0;
    const regular = item.regularPrice || 0;
    const sale = item.salePrice || 0;
    const offer = item.discountAmount || 0;
    const qty = item.quantity || 1;

    if (stock > 0) {
      const currentPrice = sale - offer;

      subtotal += currentPrice * qty;

      // 🔥 TOTAL SAVINGS (sale discount + offer discount)
      discount += (regular - currentPrice) * qty;
    }
  });

  const tax = Math.round(subtotal * 0.05);
  const deliveryCharge = 0;
  const total = subtotal + tax + deliveryCharge;

  return { subtotal, discount, tax, deliveryCharge, total };
};
