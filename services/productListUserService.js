// services/productListUserService.js
import Category from "../model/categorySchema.js";
import Brand from "../model/brandSchema.js";
import Product from "../model/productSchema.js";

export const getFilteredProducts = async (query) => {
  const categoryName = query.category || "";
  const brandName = query.brand || "";
  const minPrice = query.priceMin;
  const maxPrice = query.priceMax;
  const rating = query.rating ? Number(query.rating) : null;
  const sort = query.sort || "";
  const searchQuery = query.q ? query.q.trim() : "";
  const currentPage = parseInt(query.page) || 1;

  const limit = 2;                     // 🔹 back to your value
  const skip = (currentPage - 1) * limit;

  // ----------- MATCH STAGE (same as yours) -----------
  const matchStage = { isBlocked: false };

  if (searchQuery) {
    // your original: starts with
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

  // ----------- SORT STAGE (same keys as your code) -----------
  const sortStage = {};
  if (sort === "low") sortStage["variants.salePrice"] = 1;
  else if (sort === "high") sortStage["variants.salePrice"] = -1;
  else if (sort === "a-z") sortStage.name = 1;
  else if (sort === "z-a") sortStage.name = -1;
  else if (sort === "rating") sortStage.avgRating = -1;
  else sortStage.createdAt = -1;

  // ----------- PRICE FILTER (same style) -----------
  const priceStage = {};
  if (minPrice) priceStage["$gte"] = Number(minPrice);
  if (maxPrice) priceStage["$lte"] = Number(maxPrice);

  // ============= BASE PIPELINE (your logic + in-stock + min variant) =============
  const basePipeline = [
    { $match: matchStage },

    // Category
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

    // Brand
    {
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "brand",
      },
    },
    { $unwind: "$brand" },
    { $match: { "brand.status": true } },

    // Variant: same as yours but ✅ now only in-stock & isAvailable (like latestProducts)
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
          { $sort: { salePrice: 1 } },   // min salePrice
          { $limit: 1 }
        ],
        as: "variants",
      },
    },
    { $unwind: "$variants" },

    // inStock flag (kept from your service)
    {
      $addFields: {
        inStock: { $gt: ["$variants.stock", 0] }
      }
    }
  ];

  // Price filter on variants.salePrice (same field as you had)
  if (Object.keys(priceStage).length > 0) {
    basePipeline.push({ $match: { "variants.salePrice": priceStage } });
  }

  // ============= OFFER LOGIC (copied from latestProducts, adapted to "variants") =============

  // Product Offer
  basePipeline.push(
    {
      $lookup: {
        from: "offers",
        let: {
          productId: "$_id",
          today: new Date(),
          salePrice: "$variants.salePrice",
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

    // Category Offer
    {
      $lookup: {
        from: "offers",
        let: {
          categoryId: "$category._id",
          today: new Date(),
          salePrice: "$variants.salePrice",
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

    // Final discountAmount EXACT like latestProducts
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
    }
  );

  // ============= COUNT PIPELINE (same style as your original) =============
  const countPipeline = [
    ...basePipeline,
    { $count: "totalDocuments" },
  ];
  const countResult = await Product.aggregate(countPipeline);
  const totalDocuments = countResult.length ? countResult[0].totalDocuments : 0;
  const totalPages = Math.ceil(totalDocuments / limit);

  // ============= DATA PIPELINE WITH SORT + PAGINATION + PROJECT =============
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
        images: 1,
        avgRating: 1,
        "brand.name": 1,
        "category.name": 1,

        variantId: "$variants._id",
        regularPrice: "$variants.regularPrice",
        salePrice: "$variants.salePrice",
        inStock: 1,

        discountAmount: 1, // 🔹 for your EJS (same as latestProducts)
      },
    }
  );

  const products = await Product.aggregate(dataPipeline);

  const categories = await Category.find({ isListed: true });
  const brands = await Brand.find({ status: true });

  return {
    products,
    categories,
    brands,
    currentPage,
    totalPages,
  };
};

