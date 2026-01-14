import Category from "../model/categorySchema.js";
import Brand from "../model/brandSchema.js";
import Product from "../model/productSchema.js";
import Wishlist from "../model/wishlistSchema.js";
import mongoose from "mongoose";

import { getAppliedOffer } from "../helpers/offerHelper.js";

export const getFilteredProducts = async (query, userId) => {
  const categoryName = query.category || "";
  const brandName = query.brand || "";
  const minPrice = query.priceMin;
  const maxPrice = query.priceMax;
  const rating = query.rating ? Number(query.rating) : null;
  const sort = query.sort || "";
  const searchQuery = query.q ? query.q.trim() : "";
  const currentPage = parseInt(query.page) || 1;

  const limit = 6;
  const skip = (currentPage - 1) * limit;

  // Get wishlist variant IDs
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

  // Build match stage
  const matchStage = { isBlocked: false };

  if (searchQuery) {
    matchStage.name = { $regex: new RegExp("^" + searchQuery, "i") };
  }

  if (categoryName) {
    const category = await Category.findOne({ name: categoryName, isListed: true });
    if (category) matchStage.category = category._id;
  }

  if (brandName) {
    const brand = await Brand.findOne({ name: brandName, status: true });
    if (brand) matchStage.brand = brand._id;
  }

  if (rating) {
    matchStage.avgRating = { $gte: rating };
  }

  // Build sort stage
  const sortStage = {};
  if (sort === "low") sortStage["variant.salePrice"] = 1;
  else if (sort === "high") sortStage["variant.salePrice"] = -1;
  else if (sort === "a-z") sortStage.name = 1;
  else if (sort === "z-a") sortStage.name = -1;
  else if (sort === "rating") sortStage.avgRating = -1;
  else sortStage.createdAt = -1;

  // Build price filter
  const priceStage = {};
  if (minPrice) priceStage["$gte"] = Number(minPrice);
  if (maxPrice) priceStage["$lte"] = Number(maxPrice);

  // Base pipeline
  const basePipeline = [
    { $match: matchStage },

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
    { $match: { "brand.status": true } },

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

    // Variant lookup - only in-stock variants
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
                  { $eq: ["$isAvailable", true] },
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

    // Add wishlist flag
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
          },
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
          },
        ],
        as: "categoryOffer"
      }
    },
  ];

  // Apply price filter
  if (Object.keys(priceStage).length > 0) {
    basePipeline.push({ $match: { "variant.salePrice": priceStage } });
  }

  // Count pipeline
  const countPipeline = [
    ...basePipeline,
    { $count: "totalDocuments" },
  ];
  const countResult = await Product.aggregate(countPipeline);
  const totalDocuments = countResult.length ? countResult[0].totalDocuments : 0;
  const totalPages = Math.ceil(totalDocuments / limit);

  // Data pipeline
  const dataPipeline = [...basePipeline];

  if (Object.keys(sortStage).length > 0) {
    dataPipeline.push({ $sort: sortStage });
  }

  dataPipeline.push(
    { $skip: skip },
    { $limit: limit },
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
        productOffer: 1,   // 🔥 Include raw offer data
        categoryOffer: 1   // 🔥 Include raw offer data
      }
    }
  );

  const products = await Product.aggregate(dataPipeline);

  // 🔥 Calculate discount for each product using helper function
  const productsWithOffers = products.map(product => ({
    ...product,
    discountAmount: getAppliedOffer(product, product.salePrice)
  }));

  const categories = await Category.find({ isListed: true });
  const brands = await Brand.find({ status: true });

  return {
    products: productsWithOffers,  // 🔥 Return products with calculated offers
    categories,
    brands,
    currentPage,
    totalPages,
  };
};