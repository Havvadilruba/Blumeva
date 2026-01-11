import mongoose from "mongoose";
import Review from "../model/reviewSchema.js";
import Order from "../model/orderSchema.js";

export const findReviewByOrderItemId = (orderItemId) => {
  return Review.findOne({
    orderItemId: new mongoose.Types.ObjectId(orderItemId),
  });
};


export const createReviewRepo = ({
  userId,
  productId,
  variantId,
  orderItemId,
  rating,
  comment,
}) => {
  return Review.create({
    userId,
    productId,
    variantId,
    orderItemId,
    rating,
    comment,
  });
};


export const findOrderByUserAndItem = (userId, orderItemId) => {
  return Order.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    "orderedItems._id": new mongoose.Types.ObjectId(orderItemId),
  });
};


export const markOrderItemReviewed = async (order, orderItemId) => {
  const item = order.orderedItems.id(orderItemId);
  if (!item) return;

  item.isReviewed = true;
  await order.save();
};


export const findReviewsByProductId = (productId, limit = 10) => {
  return Review.find({
    productId: new mongoose.Types.ObjectId(productId),
  })
    .populate("userId", "name") // assuming User has `name`
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};


export const getProductRatingSummary = async (productId) => {
  const result = await Review.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
      },
    },
    {
      $group: {
        _id: "$productId",
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  return result[0] || { avgRating: 0 };
};

export const getAvgRatingsByProductIds = (productIds) => {
  return Review.aggregate([
    {
      $match: {
        productId: {
          $in: productIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
    },
    {
      $group: {
        _id: "$productId",
        avgRating: { $avg: "$rating" },
      },
    },
  ]);
};
