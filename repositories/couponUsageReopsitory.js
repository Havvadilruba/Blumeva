import couponUsage from "../model/couponUsageSchema.js";

export const countCouponUsageByCouponId = (couponId) => {
  return couponUsage.countDocuments({ couponId });
};

export const countCouponUsageByCouponIdAndUserId = (couponId, userId) => {
  return couponUsage.countDocuments({ couponId, userId });
};

export const countCouponUsageByUserId = (userId) => {
  return couponUsage.countDocuments({ userId });
};

export const couponUsageCreate = (
  couponId,
  userId,
  orderId,
  discountAmount
) => {
  return couponUsage.create({ couponId, userId, orderId, discountAmount });
};
