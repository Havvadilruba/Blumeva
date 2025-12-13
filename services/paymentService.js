import mongoose from "mongoose";
import crypto from "crypto";
import { razorpay } from "../config/razorpay.js";

import { findTempOrderById, updateTempOrder, deleteTempOrder } from "../repositories/tempOrderRepository.js";
import Order from "../model/orderSchema.js";
import Cart from "../model/cartSchema.js";
import Coupon from "../model/couponSchema.js";
import { couponUsageCreate } from "../repositories/couponUsageRepository.js";

import Variant from "../model/variantSchema.js";

const decrementVariantStock = (variantId, qty, session) => {
  return Variant.updateOne(
    { _id: variantId, stock: { $gte: qty } },
    { $inc: { stock: -qty } },
    { session }
  );
};

export const createRazorpayOrderService = async ({ amount, tempOrderId }) => {
  return await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: `temp_${tempOrderId}`
  });
};

export const verifyRazorpayPaymentService = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  tempOrderId,
  userId
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tempOrder = await findTempOrderById(tempOrderId);
    if (!tempOrder) throw { status: 400, message: "Temp order not found" };

    // Signature check
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expected !== razorpay_signature) {
      throw { status: 400, message: "Invalid payment signature" };
    }

    // Stock decrement
    for (let item of tempOrder.orderedItems) {
      const result = await decrementVariantStock(
        item.variantId,
        item.quantity,
        session
      );
      if (!result || result.modifiedCount === 0) {
        throw { status: 400, message: "Stock unavailable" };
      }
    }

    // Create Final Order
    const finalOrder = await Order.create(
      [
        {
          userId,
          addressId: tempOrder.addressId,
          orderedItems: tempOrder.orderedItems,
          shippingAddress: tempOrder.shippingAddress,
          subtotal: tempOrder.subtotal,
          discount: tempOrder.discount,
          tax: tempOrder.tax,
          deliveryCharge: tempOrder.deliveryCharge,
          couponDiscount: tempOrder.couponDiscount,
          couponId: tempOrder.couponId,
          finalAmount: tempOrder.finalAmount,
          paymentMethod: "razorpay",
          paymentStatus: "Paid",
          paymentInfo: {
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
          },
          expectedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        }
      ],
      { session }
    );

    const savedOrder = finalOrder[0];

    if (tempOrder.couponId) {
      await couponUsageCreate(tempOrder.couponId, userId, savedOrder._id, tempOrder.couponDiscount);
      await Coupon.findByIdAndUpdate(tempOrder.couponId, { $inc: { currentUsageCount: 1 } });
    }

    await Cart.deleteMany({ userId }).session(session);

    await deleteTempOrder(tempOrderId, session);

    await session.commitTransaction();
    session.endSession();

    return { success: true, orderId: savedOrder.orderId };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    return {
      success: false,
      status: err.status || 500,
      message: err.message || "Payment verification failed"
    };
  }
};
