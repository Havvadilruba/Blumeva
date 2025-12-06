// services/landingService.js
import Category from "../model/categorySchema.js";
import Brand from "../model/brandSchema.js";
import Product from "../model/productSchema.js";

export const getLandingPageData = async () => {
  const categories = await Category.find({ isListed: true })
    .sort({ createdAt: -1 })
    .limit(6);

  const brands = await Brand.find({ status: true })
    .sort({ createdAt: -1 })
    .limit(6);

 const latestProducts = await Product.aggregate([
  // Product + Brand filter
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

  // Variant filter (min sale price in-stock)
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

  // Product Offer
  {
    $lookup: {
      from: "offers",
      let: {
        productId: "$_id",
        today: new Date(),
        salePrice: "$variant.salePrice",
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
        salePrice: "$variant.salePrice",
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

  // Final Offer (EXACT reference style)
  {
    $addFields: {
      offer: {
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

  // Sort newest
  { $sort: { createdAt: -1 } },
  { $limit: 5 },

  // Final response (exact UI fields)
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

      discountAmount: "$offer",
    }
  }
]);

  return { categories, brands, latestProducts };
};
