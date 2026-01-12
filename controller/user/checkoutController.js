import dotenv from "dotenv";
dotenv.config();

import Address from "../../model/addressSchema.js";
import { getCartItems, calculateCartTotals } from "../../services/cartServices.js";
import { applyCouponService } from "../../services/checkoutService.js";
import { getAvailableCoupon } from "../../repositories/couponRepository.js";
import { findWalletByUserId } from "../../repositories/walletRepository.js";

const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    const addresses = await Address.find({ userId })
      .sort({ setDefault: -1 })
      .lean();

    const cartItems = await getCartItems(userId);
    if (!cartItems?.length) return res.redirect("/cart");

    const hasStockIssue = cartItems.some(
      item => item.stock <= 0 || item.quantity > item.stock
    );

    if (hasStockIssue) {
      req.session.checkoutError =
        "Some items have insufficient stock. Please update your cart.";
      return res.redirect("/cart");
    }

    // ✅ Calculate base totals
    const totals = calculateCartTotals(cartItems);

    // ✅ Calculate final payable amount
    let couponDiscount = 0;
    let payableAmount = totals.total;

    if (req.session.appliedCoupon) {
      couponDiscount = req.session.appliedCoupon.discount;
      payableAmount = req.session.appliedCoupon.finalAmount;
    }

    const hasAdjustedItem = cartItems.some(item => item.adjusted);
    const now = new Date();

    const availableCoupons = await getAvailableCoupon(userId, now);
    
    const walletData = await findWalletByUserId(userId);

const wallet = walletData || {
  balance: 0,
};


    return res.render("user/checkout", {
      layout: "layouts/user",
      title: "Checkout | Blumeva",
      pageCSS: "/style/user/checkout.css",
      addresses,
      cart: {
        items: cartItems,
        subtotal: totals.subtotal,
        discount: totals.discount,
        deliveryCharge: totals.deliveryCharge,
        couponDiscount: couponDiscount, 
        total: totals.total,
        payableAmount: payableAmount
      },
      hasAdjustedItem,
      availableCoupons,
      appliedCoupon: req.session.appliedCoupon || null,
      wallet,
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error("Checkout Page Load Failed:", error);
    return res.redirect("/cart");
  }
};

export const applyCoupon = async (req, res) => {
  try {
    req.session.appliedCoupon = null;

    const userId = req.session.user?._id;

    const cartItems = await getCartItems(userId);
    const totals = calculateCartTotals(cartItems); 

    const result = await applyCouponService(
      { code: req.body.code },
      userId,
      totals
    );

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    req.session.appliedCoupon = {
      couponId: result.data.couponId,
      discount: result.data.discount,
      finalAmount: result.data.finalAmount,
      code: req.body.code.toUpperCase(),
      couponType: result.data.couponType,
      couponValue: result.data.couponValue,
    };

    req.session.save(() => {
      return res.status(200).json({ success: true });
    });

  } catch (error) {
    console.error("Error on apply coupon", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const removeCoupon = (req, res) => {
  req.session.appliedCoupon = null;
  return res.status(200).json({
    success: true,
    message: "Coupon removed",
  });
};

export default { loadCheckout, applyCoupon, removeCoupon };






