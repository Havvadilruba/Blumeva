import { loadCouponsService,
    addCouponService,
    editCouponService,
    getCouponService,
    toggleCouponStatusService,
    deleteCouponService
} from "../../services/couponService.js";

import { couponSchema } from "../../validations/couponValidation.js";

export const loadCoupons = async (req, res, next) => {
  try {
    const {
      analytics,
      coupons,
      searchQuery,
      typeFilter,
      statusFilter,
      sortFilter,
      currentPage,
      totalPages,
      totalCoupons,
      limit,
    } = await loadCouponsService(req.query);

    res.status(200)
    .render("admin/coupon", {
      layout: "layouts/admin",
      title: "Coupon",
      pageCSS: "coupon",
      activePage: "coupons",
      analytics,
      coupons,
      searchQuery,
      typeFilter,
      statusFilter,
      sortFilter,
      currentPage,
      totalPages,
      totalCoupons,
      limit,
    });
  } catch (error) {
    next(error);
  }
};

export const addCoupon = async (req, res) => {
  try {
    const { error } = couponSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    await addCouponService(req.body);

    return res.status(201).json({
      success: true,
      message: "Coupon added successfully",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const editCoupon = async (req, res) => {
  try {
    const { error } = couponSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    await editCouponService(req.body,req.params.couponId)
    return res
      .status(200)
      .json({ success: true, message: "Offer editted successfully" });

  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

export const getCoupon=async(req,res)=>{
  try {
   const coupon = await getCouponService(req.params.couponId);
return res.status(200).json({ success: true, coupon });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

export const toggleCouponStatus=async(req,res)=>{
  try {
    const coupon=await toggleCouponStatusService(req.params.couponId);
    const status=coupon.isActive?'Active':'Inactive'
    return res
      .status(200)
      .json({ success: true,message:`Coupon status has been updated to ${status}`});
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message });
  }
}

export const deleteCoupon=async(req,res)=>{
  try {
    await deleteCouponService(req.params.couponId);
    return res
      .status(200)
      .json({ success: true,message:'Coupon deleted successfully'});
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message });
  }
}
export default { loadCoupons,addCoupon,editCoupon,getCoupon,toggleCouponStatus,deleteCoupon };