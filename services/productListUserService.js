import Category from "../model/categorySchema.js";
import Brand from "../model/brandSchema.js";
import Product from "../model/productSchema.js";
import Wishlist from "../model/wishlistSchema.js";
import mongoose from "mongoose";

import { getAppliedOffer } from "../helpers/offerHelper.js";

export const getFilteredProducts = async (query, userId) => {
  const categoryName = query.category || "";
  const brandName = query.brand || "";
  const search = query.search?.trim(); 
  const minPrice = query.priceMin;
  const maxPrice = query.priceMax;
  const rating = query.rating ? Number(query.rating) : null;
  const sort = query.sort || "";
  const currentPage = parseInt(query.page) || 1;

  const limit = 6;
  const skip = (currentPage - 1) * limit;

  // 🚀 Parallel execution: Get wishlist and filters at the same time
  const [wishlistData, categoryData, brandData] = await Promise.all([
    // Get wishlist variant IDs
    userId 
      ? Wishlist.findOne({ userId: new mongoose.Types.ObjectId(userId) })
          .select('items.variantId')
          .lean()
      : Promise.resolve(null),
    
    // Get category ID if needed
    categoryName 
      ? Category.findOne({ name: categoryName, isListed: true })
          .select('_id')
          .lean()
      : Promise.resolve(null),
    
    // Get brand ID if needed
    brandName 
      ? Brand.findOne({ name: brandName, status: true })
          .select('_id')
          .lean()
      : Promise.resolve(null)
  ]);

  const wishlistVariantIds = wishlistData?.items?.map(item => 
    item.variantId.toString()
  ) || [];

  // Build match stage
  const matchStage = { isBlocked: false };

  if (search) {
  matchStage.name = {
    $regex: search,
    $options: "i" // case-insensitive
  };
}

  if (categoryData) {
    matchStage.category = categoryData._id;
  }

  if (brandData) {
    matchStage.brand = brandData._id;
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
else if (sort === "new") sortStage.createdAt = -1;

  else sortStage.createdAt = -1;

  // Build price filter
  const priceStage = {};
  if (minPrice) priceStage["$gte"] = Number(minPrice);
  if (maxPrice) priceStage["$lte"] = Number(maxPrice);

  // 🚀 Optimized pipeline - reduced lookups
  const basePipeline = [
    { $match: matchStage },

    // Variant lookup - only in-stock variants (moved up for early filtering)
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

    // Apply price filter early
    ...(Object.keys(priceStage).length > 0 
      ? [{ $match: { "variant.salePrice": priceStage } }] 
      : []
    ),

    // Brand filter - only select necessary fields
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

    // Category filter - only select necessary fields
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

    // Product Offer lookup
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

    // Category Offer lookup
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

  // 🚀 Execute count and data queries in parallel
  const [countResult, products] = await Promise.all([
    // Count query
    Product.aggregate([
      ...basePipeline,
      { $count: "totalDocuments" }
    ]),
    
    // Data query with sort, skip, limit
    Product.aggregate([
      ...basePipeline,
      ...(Object.keys(sortStage).length > 0 ? [{ $sort: sortStage }] : []),
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
          productOffer: 1,
          categoryOffer: 1
        }
      }
    ])
  ]);

  const totalDocuments = countResult.length ? countResult[0].totalDocuments : 0;
  const totalPages = Math.ceil(totalDocuments / limit);

  // Calculate discount for each product
  const productsWithOffers = products.map(product => ({
    ...product,
    discountAmount: getAppliedOffer(product, product.salePrice)
  }));

  // 🚀 Get categories and brands in parallel (cached if possible)
  const [categories, brands] = await Promise.all([
    Category.find({ isListed: true }).select('name').lean(),
    Brand.find({ status: true }).select('name').lean()
  ]);

  return {
    products: productsWithOffers,
    categories,
    brands,
    currentPage,
    totalPages,
  };
};