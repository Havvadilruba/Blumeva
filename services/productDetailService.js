
import Product from "../model/productSchema.js";
import { ObjectId } from "mongodb";
import { getAppliedOffer } from "../helpers/offerHelper.js";
import {
  findReviewsByProductId,
  getProductRatingSummary,
} from "../repositories/reviewRepository.js";

export const getProductDetail = async (productId, userId = null) => {
  const [product] = await Product.aggregate([
    { $match: { _id: new ObjectId(productId) } },

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

    // Variants
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

    // Select default variant
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

    // Product Offer
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
        ],
        as: "productOffer"
      }
    },

    // Category Offer
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
        ],
        as: "categoryOffer"
      }
    },


    ...(userId ? [{
      $lookup: {
        from: "wishlists",
        let: { productId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$userId", new ObjectId(userId)] }
            }
          },
         
          { $unwind: "$items" },
          {
            $match: {
              $expr: { $eq: ["$items.productId", "$$productId"] }
            }
          },
        
          {
            $project: {
              variantId: "$items.variantId"
            }
          }
        ],
        as: "wishlistEntries"
      }
    }] : []),


    ...(userId ? [{
      $addFields: {
        wishlistedVariants: {
          $map: {
            input: "$wishlistEntries",
            as: "entry",
            in: "$$entry.variantId"
          }
        }
      }
    }] : [])
  ]);

  const variant = product.variants.find((v) => v.stock > 0) || product.variants[0];
  const offer = getAppliedOffer(product, variant.salePrice);

if (!product) return null;

const isBlocked =
  product.isBlocked ||
  !product.category?.isListed ||
  !product.brand?.status;

if (isBlocked) {
  return {
    blocked: true,
    message: "This product is currently unavailable.",
    product ,
     variant, 
  };
}

  
  

  const reviews = await findReviewsByProductId(product._id, 10);
  const { avgRating } = await getProductRatingSummary(product._id);
  const isInWishlist = userId && product.wishlistedVariants 
    ? product.wishlistedVariants.some(wv => wv.toString() === variant._id.toString())
    : false;

  product.isInWishlist = isInWishlist;

  return { 
    product, 
    variant, 
    offer,
    isInWishlist,
   reviews: reviews.map((review) => ({
      userName: review.userId?.name || "User",
      rating: review.rating,
      comment: review.comment,
      date: review.createdAt,
    })),
    avgRating,
  };
};