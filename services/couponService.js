import { countCoupon,
     findCoupons, 
     getTotalCouponUsage, 
     getTotalDiscountGiven ,
    createCoupon, 
    findCouponByCode,
    findAndUpdateCoupon,
    findCouponById,
    toggleCouponStatus,
    deleteCoupon
  
  } from "../repositories/couponRepository.js";

  import Order from "../model/orderSchema.js";
import {
  countCouponUsageByCouponId,
  countCouponUsageByCouponIdAndUserId
} from "../repositories/couponUsageRepository.js";

export const loadCouponsService = async (queryParams) => {
  const currentPage = parseInt(queryParams.page) || 1;
  const statusFilter = queryParams.status || "";
  const sortFilter = queryParams.sort || "recent";
  const searchQuery = queryParams.search || "";
  const typeFilter = queryParams.type || "";

  const query = {};

  //search
  if (searchQuery) {
    query.$or = [
      { code: { $regex: searchQuery, $options: "i" } },
      { name: { $regex: searchQuery, $options: "i" } },
    ];
  }

  //type
  if (typeFilter) {
    query.type = typeFilter;
  }

  //status
  const now = new Date();
  if (statusFilter === "active") {
    query.isActive = true;
    query.startDate = { $lte: now };
    query.endDate = { $gte: now };
  } else if (statusFilter === "inactive") {
    query.isActive = false;
  } else if (statusFilter === "expired") {
    query.endDate = { $lt: now };
  }

  //sort
  let sortOption = {};
  switch (sortFilter) {
    case "oldest":
      sortOption = { createdAt: 1 };
      break;
    case "usage-high":
      sortOption = { currentUsageCount: -1 };
      break;
    case "usage-low":
      sortOption = { currentUsageCount: 1 };
      break;
    default:
      sortOption = { createdAt: -1 };
  }

  //pagination
  const limit = 5;
  const skip = (currentPage - 1) * limit;

  const coupons = await findCoupons(query, sortOption, skip, limit);

  const totalCoupons = await countCoupon(query);
  const analytics = {
    totalCoupons: await countCoupon(),
    activeCoupons: await countCoupon({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }),
    expiredCoupons: await countCoupon({
      endDate: { $lt: now },
    }),
    totalUsage: await getTotalCouponUsage(),
    totalDiscountGiven: await getTotalDiscountGiven(),
  };

  return {
    analytics,
    coupons,
    searchQuery,
    typeFilter,
    statusFilter,
    sortFilter,
    currentPage,
    totalPages: Math.ceil(totalCoupons / limit),
    totalCoupons,
    limit:parseInt(limit),
  }
};

export const addCouponService = async (data) => {
  try {
    //exist
    const existing = await findCouponByCode(data.code);
    if (existing) {
      const error = new Error("Coupon code already in use");
      error.status = 400;
      throw error;
    }
  
    await createCoupon(data);
  
    return;
  } catch (error) {
    throw error;
  }
};

export const editCouponService = async (data,couponId) => {
  try {
    const coupon=await findCouponById(couponId);
    
    if(coupon.code!==data.code){
      //exist
      const existing = await findCouponByCode(data.code);
      if (existing) {
        const error = new Error("Coupon code already in use");
        error.status = 400;
        throw error;
      }
    }
  
    await findAndUpdateCoupon(couponId,data);
  
    return;
  } catch (error) {
    throw error;
  }
};
export const getCouponService = async (couponId) => {
  const coupon = await findCouponById(couponId)
    .populate("specificUsers", "_id username email");

  if (!coupon) throw new Error("Coupon not found");

  return coupon;
};


export const toggleCouponStatusService = async (couponId) => {
  try {
    const coupon = await toggleCouponStatus(couponId);

    if (!coupon) {
      const err = new Error("Coupon not found");
      err.status = 404;
      throw err;
    }
    return coupon;
  } catch (error) {
    throw error;
  }
};
export const deleteCouponService = async (couponId) => {
  try {
    const coupon = await findCouponById(couponId);

    if (!coupon) {
      const err = new Error("Coupon not found");
      err.status = 404;
      throw err;
    }

    await deleteCoupon(couponId);
  } catch (error) {
    throw error;
  }
};
export const validateCouponOnApply = async (coupon, userId, totalCartAmount) => {

  // Status & Validity Time
  const now = new Date();
  if (!coupon.isActive || coupon.startDate > now || coupon.endDate < now) {
    return { valid: false, message: "Coupon is not active" };
  }

  // Min purchase check
  if (totalCartAmount < coupon.minPurchaseAmount) {
    return { valid: false, message: `Requires minimum purchase of ₹${coupon.minPurchaseAmount}` };
  }

  // Limit per user
  if (coupon.usageLimitPerUser > 0) {
    const usedByUser = await countCouponUsageByCouponIdAndUserId(coupon._id, userId);
    if (usedByUser >= coupon.usageLimitPerUser) {
      return { valid: false, message: "You already used this coupon" };
    }
  }

  // Total limit
  if (coupon.totalUsageLimit > 0) {
    if (coupon.currentUsageCount >= coupon.totalUsageLimit) {
      return { valid: false, message: "Coupon usage limit reached" };
    }
  }

  // New Users only
  if (coupon.userEligibility === "new_users") {
    const userOrderCount = await Order.countDocuments({ userId });
    if (userOrderCount > 0) {
      return { valid: false, message: "Only new users can use this coupon" };
    }
  }

  return { valid: true };
};