// services/landingService.js
import Category from "../model/categorySchema.js";
import Brand from "../model/brandSchema.js";
import Product from "../model/productSchema.js";
import Wishlist from "../model/wishlistSchema.js";
import mongoose from "mongoose";

import {
  getProductRatingSummary,
} from "../repositories/reviewRepository.js";

import { getAppliedOffer } from "../helpers/offerHelper.js";

export const getLandingPageData = async (userId) => {

  let wishlistVariantIds = [];
  if (userId) {
    const wishlist = await Wishlist.findOne({
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (wishlist) {
      wishlistVariantIds = wishlist.items.map(item =>
        item.variantId.toString()
      );
    }
  }
  
  const categories = await Category.find({ isListed: true })
    .sort({ createdAt: -1 })
    .limit(6);

  const brands = await Brand.find({ status: true })
    .sort({ createdAt: -1 })
    .limit(6);

  const latestProducts = await Product.aggregate([
    // Brand filter
    {
      $lookup: {
        from: "brands",
        foreignField: "_id",
        localField: "brand",
        as: "brand",
      },
    },
    { $unwind: "$brand" },
    {
      $match: {
        isBlocked: false,
        "brand.status": true,
      },
    },

    // Category filter
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
    { $match: { "category.isListed": true } },
    
    // Get cheapest in-stock variant
    {
      $lookup: {
        from: "variants",
        let: { productId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$productId", "$$productId"] },
                  { $gte: ["$stock", 1] }
                ]
              }
            }
          },
          { $sort: { salePrice: 1 } },
          { $limit: 1 }
        ],
        as: "variant",
      },
    },
    { $unwind: "$variant" },
    
    // Add wishlist status
    {
      $addFields: {
        isInWishlist: {
          $in: [
            { $toString: "$variant._id" },
            wishlistVariantIds
          ]
        }
      }
    },

    // Product Offer - Just fetch raw data
    {
      $lookup: {
        from: "offers",
        let: {
          productId: "$_id",
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
          }
        ],
        as: "productOffer"
      }
    },

    // Category Offer - Just fetch raw data
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
          }
        ],
        as: "categoryOffer"
      }
    },
    
    { $sort: { createdAt: -1 } },
    { $limit: 5 },
    
    {
      $project: {
        _id: 1,
        name: 1,
        "brand.name": 1,
        "category.name": 1,
        avgRating: 1,
        images: 1,
        variantId: "$variant._id",
        salePrice: "$variant.salePrice",
        regularPrice: "$variant.regularPrice",
        stock: "$variant.stock",
        isInWishlist: 1,
        productOffer: 1,
        categoryOffer: 1
      }
    }
  ]);

  // 🔥 Calculate discount for each product using helper function
  const productsWithOffers = latestProducts.map(product => ({
    ...product,
    discountAmount: getAppliedOffer(product, product.salePrice)
  }));


  return { categories, brands, latestProducts: productsWithOffers };
};