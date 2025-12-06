
// services/productDetailService.js
import Product from "../model/productSchema.js";
import { ObjectId } from "mongodb";

export const getProductDetail = async (productId) => {
  const [product] = await Product.aggregate([
    // Your original match
    { $match: { _id: new ObjectId(productId), isBlocked: false } },

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

    // Variants (same as you had, all variants sorted by salePrice)
    {
      $lookup: {
        from: "variants",
        let: { productId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$productId", "$$productId"] }
            }
          },
          { $sort: { salePrice: 1 } }
        ],
        as: "variants",
      },
    },

    // 👇 Select default variant SAME LOGIC as your JS:
    // const variant = product.variants.find(v => v.stock > 0) || product.variants[0];
    {
      $addFields: {
        selectedVariant: {
          $let: {
            vars: {
              filtered: {
                $filter: {
                  input: "$variants",
                  as: "v",
                  cond: { $gt: ["$$v.stock", 0] }
                }
              }
            },
            in: {
              $cond: [
                { $gt: [{ $size: "$$filtered" }, 0] },
                { $arrayElemAt: ["$$filtered", 0] },
                { $arrayElemAt: ["$variants", 0] }
              ]
            }
          }
        }
      }
    },

    // 🔥 PRODUCT OFFER (same pattern as landing/list but uses selectedVariant.salePrice)
    {
      $lookup: {
        from: "offers",
        let: {
          productId: "$_id",
          today: new Date(),
          salePrice: "$selectedVariant.salePrice",
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

    // CATEGORY OFFER
    {
      $lookup: {
        from: "offers",
        let: {
          categoryId: "$category._id",
          today: new Date(),
          salePrice: "$selectedVariant.salePrice",
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

    // FINAL discountAmount like landing/list
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
  ]);

  // same checks as your original
  if (!product || !product.category.isListed || !product.brand.status) {
    return res.redirect("/products");
  }

  // same variant-choosing logic you wrote
  const variant =
    product.variants.find((v) => v.stock > 0) || product.variants[0];

  return { product, variant };
};
