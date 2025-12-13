import mongoose from "mongoose";
import crypto from "crypto";

import {
  findTempOrderById,
  deleteTempOrder,
} from "../../repositories/tempOrderRepository.js";

import Order from "../../model/orderSchema.js";
import Variant from "../../model/variantSchema.js";
import Cart from "../../model/cartSchema.js";
import Coupon from "../../model/couponSchema.js";
import { couponUsageCreate } from "../../repositories/couponUsageRepository.js";

// ------------------------------
//   VERIFY PAYMENT CONTROLLER
// ------------------------------
const verifyRazorpayPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      tempOrderId,
    } = req.body;

    const userId = req.session.user?._id;
    if (!userId)
      return res.json({ success: false, message: "Login required" });

    // -------------------------------------------
    // 1. Fetch TEMP ORDER
    // -------------------------------------------
    const tempOrder = await findTempOrderById(tempOrderId);
    if (!tempOrder)
      throw { status: 400, message: "Temporary order not found" };

    // -------------------------------------------
    // 2. Verify Razorpay Signature (Mandatory)
    // -------------------------------------------
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw { status: 400, message: "Invalid payment signature" };
    }

    // -------------------------------------------
    // 3. Reduce Stock
    // -------------------------------------------
    for (let item of tempOrder.orderedItems) {
      const updated = await Variant.updateOne(
        { _id: item.variantId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session }
      );

      if (!updated.modifiedCount) {
        throw { status: 400, message: "Insufficient stock for items" };
      }
    }

    // -------------------------------------------
    // 4. Create FINAL ORDER
    // -------------------------------------------
    const [finalOrder] = await Order.create(
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
          orderStatus: "Confirmed", // OPTIONAL BUT GOOD

          paymentInfo: {
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
          },

          expectedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
      ],
      { session }
    );

    // -------------------------------------------
    // 5. Handle Coupon Usage
    // -------------------------------------------
    if (tempOrder.couponId) {
      await couponUsageCreate(
        tempOrder.couponId,
        userId,
        finalOrder._id,
        tempOrder.couponDiscount
      );

      await Coupon.findByIdAndUpdate(
        tempOrder.couponId,
        { $inc: { currentUsageCount: 1 } },
        { session }
      );
    }

    // -------------------------------------------
    // 6. Clear Cart
    // -------------------------------------------
    await Cart.deleteMany({ userId }, { session });

    // -------------------------------------------
    // 7. Delete Temp Order
    // -------------------------------------------
    await deleteTempOrder(tempOrderId, session);

    await session.commitTransaction();
    session.endSession();

    req.session.appliedCoupon = null;

    return res.json({
      success: true,
      message: "Payment Verified Successfully",
      orderId: finalOrder.orderId,
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    return res.json({
      success: false,
      message: err.message || "Payment verification failed",
    });
  }
};

export default { verifyRazorpayPayment };

