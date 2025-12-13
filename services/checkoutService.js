import {
  countCouponUsageByCouponId,
  countCouponUsageByCouponIdAndUserId,
  countCouponUsageByUserId
} from "../repositories/couponUsageRepository.js";
import { applyCouponSchema } from "../validations/couponValidation.js";
import { findCouponByCode } from "../repositories/couponRepository.js";

export const applyCouponService = async (body, userId, cartTotals) => {
  const { error } = applyCouponSchema.validate(body);
  if (error) {
    return {
      status: 422,
      success: false,
      message: error.details[0].message,
    };
  }

  const { code } = body;
  const coupon = await findCouponByCode(code.toUpperCase());

  if (!coupon) {
    return { status: 404, success: false, message: "Invalid coupon" };
  }

  const now = new Date();
  if (!coupon.isActive || now < coupon.startDate || now > coupon.endDate) {
    return {
      status: 410,
      success: false,
      message: "Coupon is not active or expired",
    };
  }

  // Usage limits
  if (coupon.totalUsageLimit > 0) {
    const totalUsed = await countCouponUsageByCouponId(coupon._id);
    if (totalUsed >= coupon.totalUsageLimit) {
      return { status: 403, success: false, message: "Usage limit exceeded" };
    }
  }

  if (coupon.usageLimitPerUser > 0) {
    const userUsed = await countCouponUsageByCouponIdAndUserId(
      coupon._id,
      userId
    );
    if (userUsed >= coupon.usageLimitPerUser) {
      return {
        status: 403,
        success: false,
        message: "You already used this coupon",
      };
    }
  }

  // Eligibility
  if (coupon.userEligibility === "specific") {
    const allowed = coupon.specificUsers.some(
      (id) => id.toString() === userId.toString()
    );
    if (!allowed) {
      return { status: 403, success: false, message: "Not eligible" };
    }
  }

  if (coupon.userEligibility === "new_users") {
    const prevUsage = await countCouponUsageByUserId(userId);
    if (prevUsage > 0) {
      return {
        status: 403,
        success: false,
        message: "Only for new users",
      };
    }
  }

  // 💥 Use server-values only
  const subtotal = cartTotals.subtotal;

  // Min purchase based on subtotal before discount
  if (subtotal < coupon.minPurchaseAmount) {
    return {
      status: 400,
      success: false,
      message: `Min purchase required ₹${coupon.minPurchaseAmount}`,
    };
  }

  // Discount calculation
  let discount =
    coupon.type === "percentage"
      ? (coupon.discountValue / 100) * subtotal
      : coupon.discountValue;

  if (coupon.maxDiscount > 0) {
    discount = Math.min(discount, coupon.maxDiscount);
  }

  // New totals AFTER coupon
  const newSubtotal = Math.max(subtotal - discount, 0);
  const newTax = Math.round(newSubtotal * 0.05);
  const finalAmount = newSubtotal + cartTotals.deliveryCharge + newTax;

  return {
    status: 200,
    success: true,
    data: {
      couponId: coupon._id,
      discount,
      finalAmount,
      couponType: coupon.type,
      couponValue: coupon.discountValue,
    },
  };
};
