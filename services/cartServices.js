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

    // filter out unavailable items
    {
      $match: {
        "product.isBlocked": false,
        "brand.status": true,
        "category.isListed": true,
      }
    },

    {
      $addFields: {
        stock: "$variant.stock",
        salePrice: "$variant.salePrice",
        regularPrice: "$variant.regularPrice",
        images: "$product.images",
      }
    }
  ]);
};


export const calculateCartTotals = (items) => {
  let subtotal = 0;
  let discount = 0;

  items.forEach(item => {
    const stock = item.variantId?.stock || item.stock;
    const salePrice = item.variantId?.salePrice || item.salePrice;
    const regularPrice = item.variantId?.regularPrice || item.regularPrice;

    if (stock > 0) {
      subtotal += salePrice * item.quantity;
      discount += (regularPrice - salePrice) * item.quantity;
    }
  });

  const tax = Math.round(subtotal * 0.05);
  const deliveryCharge = 0;
  const total = subtotal + tax + deliveryCharge;

  return { subtotal, discount, tax, deliveryCharge, total };
};
