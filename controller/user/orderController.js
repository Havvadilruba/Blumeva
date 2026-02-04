import TempOrder from "../../model/tempOrderSchema.js";
import crypto from "crypto";
import PDFDocument from "pdfkit";

import mongoose from "mongoose";

import Order from "../../model/orderSchema.js";
import Address from "../../model/addressSchema.js";
import Cart from "../../model/cartSchema.js";
import Wallet from "../../model/walletSchema.js";
import Variant from "../../model/variantSchema.js";

import { getCartItems, calculateCartTotals } from "../../services/cartServices.js";
import { orderValidation } from "../../validations/placeOrderValidation.js";
import {
  findWalletByUserId,
  updateWalletBalance,
  updateWalletHoldBalance,
  updateWalletTotalDebits,
} from "../../repositories/walletRepository.js";
import {
  createHoldRecord,
  updateHoldStatus,
} from "../../repositories/walletHoldRepository.js";
import { createLedgerEntry } from "../../repositories/walletLedgerRepository.js";
import { updateUserWalletBalance } from "../../repositories/userRepository.js";
import { couponUsageCreate } from "../../repositories/couponUsageRepository.js";
import Coupon from "../../model/couponSchema.js";
import { razorpay } from "../../config/razorpay.js";


const decrementVariantStock = (variantId, qty, session) => {
  return Variant.updateOne(
    { _id: variantId, stock: { $gte: qty } },
    { $inc: { stock: -qty } },
    { session }
  );
};

function distributeCoupon(orderedItems, couponDiscount) {
  if (!couponDiscount || couponDiscount <= 0) return orderedItems;

  let totalBase = 0;
  orderedItems.forEach(item => {
    const base = (item.salePrice - item.discountAmount) * item.quantity;
    item._base = base;
    totalBase += base;
  });

  if (totalBase === 0) return orderedItems;

  orderedItems.forEach(item => {
    const share = (item._base / totalBase) * couponDiscount;
    item.couponShare = parseFloat(share.toFixed(2)); 
  });

  return orderedItems;
}


export const placeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const { error } = orderValidation.validate(req.body);
    if (error) {
      throw { status: 400, message: error.details[0].message };
    }

    const { addressId, paymentMethod } = req.body;

   
    // GET CART ITEMS
    
    const items = await getCartItems(userId);
    if (!items.length) {
      throw { status: 400, message: "Cart is empty" };
    }

   
    // STOCK VALIDATION 

    const hasStockIssue = items.some(
      item => item.stock <= 0 || item.quantity > item.stock
    );

    if (hasStockIssue) {
     
      req.session.appliedCoupon = null;

      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        redirect: "/cart",
        message:
          "Some items in your cart have insufficient stock. Please update quantities to continue."
      });
    }

   
    // CALCULATE TOTALS

    const totals = calculateCartTotals(items);
    const appliedCoupon = req.session.appliedCoupon || null;

    let finalSubtotal = totals.subtotal;
    let couponDiscount = 0;
    let finalAmount = totals.total;

    if (appliedCoupon) {
  couponDiscount = appliedCoupon.discount;

  finalAmount = Math.max(totals.total - couponDiscount, 0);
}

    // ADDRESS VALIDATION

    const address = await Address.findById(addressId).session(session);
    if (!address) {
      throw { status: 400, message: "Invalid address" };
    }

    const expectedDelivery = new Date(Date.now() + 5 * 86400000);

  
    // ORDERED ITEMS 

    let orderedItems = items.map(item => ({
      productId: item.product._id,
      variantId: item.variant._id,
      quantity: item.quantity,
      regularPrice: item.regularPrice,
      salePrice: item.salePrice,
      discountAmount: item.discountAmount || 0,
      couponShare: 0,
    }));

    if (appliedCoupon) {
      orderedItems = distributeCoupon(orderedItems, couponDiscount);
    }

    const shippingAddress = {
      fullName: address.fullName,
      phone: address.phone,
      address1: address.address1,
      address2: address.address2,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
      addressType: address.addressType
    };

    
    // RAZORPAY
 
    if (paymentMethod === "razorpay") {
      await TempOrder.deleteMany({
        userId,
        razorpayStatus: { $in: ["INITIATED", "FAILED"] },
        createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) }
      }).session(session);

      const [tempOrder] = await TempOrder.create([{
        userId,
        addressId,
        orderedItems,
        shippingAddress,
        subtotal: totals.subtotal,
        discount: totals.discount,
        deliveryCharge: totals.deliveryCharge,
        couponDiscount,
        couponId: appliedCoupon?.couponId || null,
        finalAmount,
        paymentMethod: "razorpay",
        paymentStatus: "Pending",
        razorpayStatus: "INITIATED"
      }], { session });

      const rpOrder = await razorpay.orders.create({
        amount: finalAmount * 100,
        currency: "INR",
        receipt: `tmp_${tempOrder._id}`
      });

      tempOrder.razorpayOrderId = rpOrder.id;
      await tempOrder.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.json({
        success: true,
        tempOrderId: tempOrder._id,
        razorpayOrderId: rpOrder.id,
        amount: rpOrder.amount
      });
    }

  
    // COD
 
    if (paymentMethod === "cod") {
      for (const item of items) {
        const r = await decrementVariantStock(
          item.variant._id,
          item.quantity,
          session
        );
        if (!r.modifiedCount) {
          throw { status: 400, message: "Insufficient stock" };
        }
      }

      if (paymentMethod === "cod" && finalAmount > 1000) {
  throw {
    status: 400,
    message: "Cash on Delivery is available only for orders up to ₹1000",
  };
}

      const [order] = await Order.create([{
        userId,
        addressId,
        orderedItems,
        shippingAddress,
        subtotal: totals.subtotal,
        discount: totals.discount,
        deliveryCharge: totals.deliveryCharge,
        couponDiscount,
        couponId: appliedCoupon?.couponId || null,
        finalAmount,
        paymentMethod: "cod",
        paymentStatus: "Pending",
        expectedDelivery
      }], { session });

      if (appliedCoupon) {
        await couponUsageCreate(
          appliedCoupon.couponId,
          userId,
          order._id,
          couponDiscount,
          session
        );
        await Coupon.findByIdAndUpdate(
          appliedCoupon.couponId,
          { $inc: { currentUsageCount: 1 } },
          { session }
        );
      }

      await Cart.deleteMany({ userId }).session(session);
      req.session.appliedCoupon = null;

      await session.commitTransaction();
      session.endSession();

      return res.json({ success: true, orderId: order.orderId });
    }

  
    // WALLET

    if (paymentMethod === "wallet") {
      const wallet = await findWalletByUserId(userId, session);
      if (!wallet || wallet.balance - wallet.holdBalance < finalAmount) {
        throw { status: 400, message: "Insufficient wallet balance" };
      }

      for (const item of items) {
        const r = await decrementVariantStock(
          item.variant._id,
          item.quantity,
          session
        );
        if (!r.modifiedCount) {
          throw { status: 400, message: "Insufficient stock" };
        }
      }

      const [order] = await Order.create([{
        userId,
        addressId,
        orderedItems,
        shippingAddress,
        subtotal: totals.subtotal,
        discount: totals.discount,
        deliveryCharge: totals.deliveryCharge,
        couponDiscount,
        couponId: appliedCoupon?.couponId || null,
        finalAmount,
        paymentMethod: "wallet",
        paymentStatus: "Pending",
        expectedDelivery
      }], { session });

      await updateWalletHoldBalance(userId, finalAmount, session);
      const [hold] = await createHoldRecord({
        userId,
        walletId: wallet._id,
        orderId: order._id,
        amount: finalAmount,
        status: "HELD"
      }, session);

      await createLedgerEntry({
        walletId: wallet._id,
        userId,
        amount: finalAmount,
        type: "HOLD",
        referenceId: order._id,
        note: "Wallet amount reserved for order",
        balanceAfter: wallet.balance
      }, session);

      await updateWalletHoldBalance(userId, -finalAmount, session);
      await updateWalletBalance(userId, -finalAmount, session);

      const newBalance = wallet.balance - finalAmount;

      await updateWalletTotalDebits(userId, finalAmount, session);
      await updateHoldStatus(hold._id, "CAPTURED", session);

      await createLedgerEntry({
        walletId: wallet._id,
        userId,
        amount: finalAmount,
        type: "DEBIT",
        referenceId: order._id,
        note: "Wallet payment captured",
        balanceAfter: newBalance
      }, session);

      await updateUserWalletBalance(userId, newBalance, session);
      await Order.findByIdAndUpdate(order._id, { paymentStatus: "Paid" }, { session });

      if (appliedCoupon) {
        await couponUsageCreate(
          appliedCoupon.couponId,
          userId,
          order._id,
          couponDiscount,
          session
        );
        await Coupon.findByIdAndUpdate(
          appliedCoupon.couponId,
          { $inc: { currentUsageCount: 1 } },
          { session }
        );
      }

      await Cart.deleteMany({ userId }).session(session);
      req.session.appliedCoupon = null;

      await session.commitTransaction();
      session.endSession();

      return res.json({
        success: true,
        orderId: order.orderId,
        message: "Wallet order placed"
      });
    }

    throw { status: 400, message: "Invalid payment method" };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Something went wrong"
    });
  }
};



export const verifyPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tempOrderId } = req.body;

    const userId = req.session.user?._id;
    if (!userId) {
      await session.abortTransaction();
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const tempOrder = await TempOrder.findById(tempOrderId).session(session);
    if (!tempOrder) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Temp order not found" });
    }

    // Check razorpayStatus 
    if (tempOrder.razorpayStatus === "PAID") {
      await session.abortTransaction();
      return res.json({
        success: false,
        message: "Payment already processed"
      });
    }

    // Verify signature
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // Signature mismatch = payment failed
    if (expectedSig !== razorpay_signature) {
      tempOrder.paymentStatus = "Failed";
      tempOrder.razorpayStatus = "FAILED";
      await tempOrder.save({ session });
      await session.commitTransaction();

      return res.json({
        success: false,
        message: "Payment signature verification failed"
      });
    }

    // Reduce stock
    for (const item of tempOrder.orderedItems) {
      const result = await Variant.updateOne(
        { _id: item.variantId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session }
      );

      if (!result.modifiedCount) {
        await session.abortTransaction();
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock` 
        });
      }
    }

    // Create final order
    const [orderDoc] = await Order.create([{
      userId,
      addressId: tempOrder.addressId,
      orderedItems: tempOrder.orderedItems,
      shippingAddress: tempOrder.shippingAddress,
      subtotal: tempOrder.subtotal,
      discount: tempOrder.discount,
      deliveryCharge: tempOrder.deliveryCharge,
      couponDiscount: tempOrder.couponDiscount,
      couponId: tempOrder.couponId,
      finalAmount: tempOrder.finalAmount,
      paymentMethod: "razorpay",
      paymentStatus: "Paid",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      expectedDelivery: new Date(Date.now() + 5 * 86400000)
    }], { session });

   
    const order = await Order.findById(orderDoc._id).session(session);

    // Create coupon usage record
    if (tempOrder.couponId) {
      await couponUsageCreate(
        tempOrder.couponId, 
        userId, 
        order._id, 
        tempOrder.couponDiscount, 
        session
      );
      
      await Coupon.findByIdAndUpdate(
        tempOrder.couponId, 
        { $inc: { currentUsageCount: 1 } }, 
        { session }
      );
    }

    // Clear cart
    await Cart.deleteMany({ userId }).session(session);

    // Clear session coupon
    req.session.appliedCoupon = null;

    // Update temp order
    tempOrder.paymentStatus = "Success";
    tempOrder.razorpayStatus = "PAID";
    tempOrder.finalOrderId = order.orderId;
    tempOrder.razorpayPaymentId = razorpay_payment_id;
    tempOrder.razorpaySignature = razorpay_signature;
    await tempOrder.save({ session });

    // Clean up temp order
    await TempOrder.deleteOne({ _id: tempOrderId }).session(session);

    await session.commitTransaction();

    return res.json({
      success: true,
      orderId: order.orderId,
      message: "Payment verified successfully"
    });

  } catch (err) {
    console.error("Payment verification error:", err);
    await session.abortTransaction();
    return res.status(err.status || 500).json({ 
      success: false, 
      message: err.message || "Payment verification failed"
    });
  } finally {
    session.endSession();
  }
};

const loadOrderSuccess = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { orderId } = req.params;

    if (!userId) return res.redirect("/login");

    const order = await Order.findOne({ orderId, userId })
      .populate("orderedItems.productId")
      .populate("orderedItems.variantId")
      .lean();

    if (!order) {
      return res.redirect("/pageNotFound");
    }

    res.render("user/orderSuccess", {
      layout: "layouts/user",
      title: "Order Success | Blumeva",
      pageCSS: "/style/user/orderSuccess.css",
      order,
    });

  } catch (err) {
    console.error("Order success page error:", err);
    res.redirect("/pageNotFound");
  }
};

const loadOrderFailure = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.redirect("/login");
    }

    const order = await TempOrder.findById(id);

    if (!order) {
      return res.redirect("/pageNotFound");
    }
    if (order.userId.toString() !== userId.toString()) {
      return res.redirect("/pageNotFound");
    }

    res.render("user/payment-failed", {
      layout: "layouts/user",
      title: "Payment Failed | Blumeva",
      pageCSS: "/style/user/payment-failed.css",
      order,
    });
  } catch (err) {
    console.error("Load order failure error:", err);
    res.redirect("/pageNotFound");
  }
};

const retryPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tempOrderId = req.params.id;
    const userId = req.session.user?._id;

    if (!userId) {
      await session.abortTransaction();
      return res.status(401).json({
        success: false,
        message: "Login required",
      });
    }

    // Find existing temp order
    const tempOrder = await TempOrder.findById(tempOrderId).session(session);

    if (!tempOrder) {
      await session.abortTransaction();
      return res.json({
        success: false,
        message: "Order not found",
      });
    }

    // Security check
    if (tempOrder.userId.toString() !== userId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (tempOrder.razorpayStatus === "PAID") {
      await session.abortTransaction();
      return res.json({
        success: false,
        message: "Order already paid",
      });
    }

    // Create new Razorpay order
    const razorpayOrder = await razorpay.orders.create({
  amount: tempOrder.finalAmount * 100,
  currency: "INR",
  receipt: `retry_${tempOrder._id.toString().slice(-8)}`,
});


    tempOrder.razorpayOrderId = razorpayOrder.id;
    tempOrder.razorpayStatus = "INITIATED";
    tempOrder.paymentStatus = "Pending";
    await tempOrder.save({ session });

    await session.commitTransaction();

    return res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      tempOrderId: tempOrder._id,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Retry payment error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Payment retry failed",
    });
  } finally {
    session.endSession();
  }
};


const deleteTempOrderController = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.session.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Login required",
      });
    }

    const tempOrder = await TempOrder.findById(orderId);

    if (!tempOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Security check
    if (tempOrder.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    
    if (tempOrder.razorpayStatus === "PAID") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete paid orders",
      });
    }

    await TempOrder.deleteOne({ _id: orderId });

    return res.json({
      success: true,
      message: "Temp order deleted successfully",
    });
  } catch (err) {
    console.error("Delete temp order error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Failed to delete temp order",
    });
  }
};

const loadOrders = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.redirect("/login");
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const statusFilter = req.query.status || "";

    let query = { userId };

    if (search) {
      query.orderId = { $regex: search, $options: "i" };
    }

    if (statusFilter) {
      query.orderStatus = statusFilter;
    }

    const orders = await Order.find(query)
      .populate({
        path: "orderedItems.productId",
        select: "name images",
      })
      .populate({
        path: "orderedItems.variantId",
        select: "quantityValue quantityType",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    res.render("user/orders", {
      layout: "layouts/user",
      title: "My Orders | Blumeva",
      pageCSS: "/style/user/orderss.css",
      activePage: "orders",
      orders,
      currentPage: page,
      totalPages,
      search,
      statusFilter,
    });
  } catch (err) {
    console.error("Load orders error:", err);
    res.redirect("/pageNotFound");
  }
};

const loadOrderDetail = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.redirect("/login");
    }

    const { id } = req.params;

    const order = await Order.findOne({ _id: id, userId })
      .populate({
        path: "orderedItems.productId",
        select: "name images",
      })
      .populate({
        path: "orderedItems.variantId",
        select: "quantityValue quantityType regularPrice salePrice",
      })
      .lean();

    if (!order) {
      return res.redirect("/pageNotFound");
    }

    res.render("user/orderDetails", {
      layout: "layouts/user",
      title: `Order ${order.orderId} | Blumeva`,
      pageCSS: "/style/user/orderDetails.css",
      activePage: "orders",
      order,
    });
  } catch (err) {
    console.error("Load order detail error:", err);
    res.redirect("/pageNotFound");
  }
};


const cancelOrderItems = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.json({ success: false, message: "Please login" });
    }

    const { id } = req.params;
    const { itemIds, reason } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.json({ success: false, message: "No items selected" });
    }

    // Fetch order inside session
    const order = await Order.findOne({ _id: id, userId })
      .populate("orderedItems.variantId")
      .session(session);

    if (!order) {
      await session.abortTransaction();
      return res.json({ success: false, message: "Order not found" });
    }

    const cancellable = ["Pending", "Confirmed", "Processing"];
    let cancelledCount = 0;
    let refundAmount = 0;
   


    const now = new Date();


    for (const itemIdStr of itemIds) {
      const item = order.orderedItems.id(itemIdStr);
      if (!item) continue;

      if (!cancellable.includes(item.itemStatus)) continue;

      // Mark cancelled
      item.itemStatus = "Cancelled";
      item.reason = reason || "";
      item.itemTimeline = item.itemTimeline || {};
      item.itemTimeline.cancelledAt = now;

      // Restore stock 
      await Variant.updateOne(
        { _id: item.variantId._id },
        { $inc: { stock: item.quantity } },
        { session }
      );

      cancelledCount++;

      // refund
 if (order.paymentStatus === "Paid" && !item.refundProcessed) {
  const salePrice = item.salePrice || 0;
  const discountAmount = item.discountAmount || 0;
  const couponShare = item.couponShare || 0;

  const couponPerUnit = couponShare / item.quantity;
  const finalPricePerUnit =
    salePrice - discountAmount - couponPerUnit;

  const itemRefund =
    Math.round(finalPricePerUnit * item.quantity * 100) / 100;

  refundAmount += itemRefund;
  item.refundProcessed = true;
}

    }

    // Noo CANCELLATION
    if (cancelledCount === 0) {
      await session.abortTransaction();
      return res.json({
        success: false,
        message: "No items were cancelled",
      });
    }

    // Update order status
    const allCancelled = order.orderedItems.every(i => i.itemStatus === "Cancelled");
    order.orderStatus = allCancelled ? "Cancelled" : "Partially Cancelled";
    if (allCancelled) {
      order.statusTimeline = order.statusTimeline || {};
      order.statusTimeline.cancelledAt = now;
    }


    //  refund  (wallet, razorpay)
    if (refundAmount > 0 && order.paymentStatus === "Paid") {
      let wallet = await Wallet.findOne({ userId }).session(session);

// Auto-create wallet if not exists
if (!wallet) {
  const [newWallet] = await Wallet.create(
    [
      {
        userId,
        balance: 0,
        holdBalance: 0,
        totalCredits: 0,
        totalDebits: 0,
      },
    ],
    { session }
  );

  wallet = newWallet; // ✅ Now allowed because it's "let"
}


      // Credit wallet
      await Wallet.updateOne(
        { userId },
        { 
          $inc: { balance: refundAmount, totalCredits: refundAmount },
          lastTransactionAt: now
        },
        { session }
      );

      const newBal = wallet.balance + refundAmount;

      // Create ledger entry
      await createLedgerEntry(
        {
          walletId: wallet._id,
          userId,
          amount: refundAmount,
          type: "REFUND",
          referenceId: order._id,
          note: `Refund for cancelled items in order ${order.orderId}`,
          balanceAfter: newBal,
        },
        session
      );

      // Update wallet balance
      await updateUserWalletBalance(userId, newBal, session);
    }

    // Save order
    await order.save({ session });

    await session.commitTransaction();

    return res.json({
  success: true,
  message: `${cancelledCount} item(s) cancelled successfully`,
  refund: refundAmount,
});


  } catch (err) {
    console.error("Cancel Error:", err);
    await session.abortTransaction();
    return res.json({ success: false, message: "Something went wrong" });
  } finally {
    session.endSession();
  }
};

const requestReturn = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.json({ success: false, message: "Please login" });
    }

    const { id } = req.params;
    const { itemId, reason } = req.body;

   
    if (!reason || reason.trim() === "") {
      return res.json({
        success: false,
        message: "Return reason is mandatory",
      });
    }

    const order = await Order.findOne({ _id: id, userId });

    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

  
    const item = order.orderedItems.id(itemId);
    if (!item) {
      return res.json({ success: false, message: "Item not found" });
    }


    if (item.itemStatus !== "Delivered") {
      return res.json({
        success: false,
        message: "Only delivered items can be returned",
      });
    }

    // Check already  
    if (["ReturnRequested", "ReturnApproved", "Returned"].includes(item.itemStatus)) {
      return res.json({
        success: false,
        message: "Return already requested for this item",
      });
    }

    // 7 days from item delivery
    const deliveredDate = item.itemTimeline?.deliveredAt || order.deliveredDate;
    if (deliveredDate) {
      const daysSinceDelivery = Math.floor(
        (new Date() - new Date(deliveredDate)) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceDelivery > 7) {
        return res.json({
          success: false,
          message: "Return window expired. Items can only be returned within 7 days of delivery",
        });
      }
    } else {
      return res.json({
        success: false,
        message: "Delivery date not found",
      });
    }

    const now = new Date();

    // Update item status
    item.itemStatus = "ReturnRequested";
    if (!item.itemTimeline) item.itemTimeline = {};
    item.itemTimeline.returnRequestedAt = now;
    item.reason = reason.trim();

    // Update order status
    // const returnStatuses = ["ReturnRequested", "ReturnApproved", "Returned"];
    // const someReturning = order.orderedItems.some(i => 
    //   returnStatuses.includes(i.itemStatus)
    // );
    // const allDeliveredOrReturning = order.orderedItems.every(i => 
    //   i.itemStatus === "Delivered" || returnStatuses.includes(i.itemStatus)
    // );

    // if (someReturning) {
    //   if (allDeliveredOrReturning) {
    //     order.orderStatus = "Partially Returned";
    //   }
    // }
   


            const returnedItems = order.orderedItems.filter(
              (i) => i.itemStatus === "Returned"
            ).length;

            const totalItems = order.orderedItems.length;

            if (returnedItems === totalItems && totalItems > 0) {
              order.orderStatus = "Returned";
            }
            else if (returnedItems > 0 && returnedItems < totalItems) {
              order.orderStatus = "Partially Returned";
            }



    order.markModified("orderedItems");
    await order.save();

    res.json({
      success: true,
      message: "Return request submitted successfully",
    });
  } catch (error) {
    console.error("Request return error:", error);
    res.json({
      success: false,
      message: "Failed to submit return request",
    });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    const { id } = req.params;

    const order = await Order.findOne({ _id: id, userId })
      .populate("userId", "name email phone")
      .populate({
        path: "orderedItems.productId",
        select: "name images",
      })
      .populate({
        path: "orderedItems.variantId",
        select: "quantityValue quantityType",
      })
      .lean();

    if (!order) return res.status(404).send("Order not found");

    const allowedStatuses = [
      "Delivered",
      "Cancelled",
      "Returned",
      "Partially Returned",
      "Partially Cancelled",
      "Partially Delivered",
    ];

    if (!allowedStatuses.includes(order.orderStatus)) {
      return res.status(400).send("Invoice not available for this order");
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${order.orderId}.pdf`
    );

    doc.pipe(res);

    /* ------------------------------------
       HEADER
    ------------------------------------ */
    doc.fontSize(24).font("Helvetica-Bold").text("BLUMEVA", { align: "center" });
    doc.fontSize(10).font("Helvetica").text("Face Care", { align: "center" });
    doc.moveDown();

    doc.fontSize(20).font("Helvetica-Bold").text("INVOICE", { align: "center" });
    doc.moveDown();

    doc.fontSize(10).font("Helvetica");
    doc.text(`Invoice No: ${order.orderId}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`);
    doc.text(`Payment: ${order.paymentMethod.toUpperCase()}`);
    doc.text(`Status: ${order.paymentStatus}`);
    doc.moveDown();

    /* ------------------------------------
       BILLING / SHIPPING
    ------------------------------------ */
    const leftX = 50;
    const rightX = 300;
    const startY = doc.y;

    doc.font("Helvetica-Bold").text("Bill To:", leftX, startY);
    doc.font("Helvetica").text(order.userId?.name || "", leftX, startY + 20);
    doc.text(order.userId?.email || "", leftX, startY + 35);

    doc.font("Helvetica-Bold").text("Ship To:", rightX, startY);
    doc.font("Helvetica").text(order.shippingAddress?.fullName || "", rightX, startY + 20);
    doc.text(order.shippingAddress?.phone || "", rightX, startY + 35);
    doc.text(order.shippingAddress?.address1 || "", rightX, startY + 50, { width: 200 });
    doc.text(
      `${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${order.shippingAddress?.pincode}`,
      rightX,
      startY + 65
    );

    doc.moveDown(6);

    /* ------------------------------------
       ITEMS TABLE
    ------------------------------------ */
    const tableTop = doc.y;
    const itemX = 50;
    const descX = 140;
    const qtyX = 350;
    const priceX = 410;
    const totalX = 480;

    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("#", itemX, tableTop);
    doc.text("Description", descX, tableTop);
    doc.text("Qty", qtyX, tableTop);
    doc.text("Price", priceX, tableTop);
    doc.text("Total", totalX, tableTop);

    doc.moveDown();
    doc.font("Helvetica").fontSize(9);

    let y = doc.y;
    let index = 1;
    let invoiceSubtotal = 0;

    order.orderedItems.forEach((item) => {
      const salePrice = item.salePrice || 0;
      const discount = item.discountAmount || 0;
      const couponShare = item.couponShare || 0;
      const qty = item.quantity || 1;

      const couponPerUnit = couponShare / qty;
      const finalUnitPrice = salePrice - discount - couponPerUnit;

      const isInactive =
        item.itemStatus === "Cancelled" ||
        item.itemStatus === "Returned";

      const lineTotal = isInactive
        ? 0
        : Math.round(finalUnitPrice * qty * 100) / 100;

      if (!isInactive) invoiceSubtotal += lineTotal;

      const variantInfo = item.variantId
        ? `${item.variantId.quantityValue}${item.variantId.quantityType}`
        : "";

      doc.text(index++, itemX, y);
      doc.text(
        `${item.productId?.name || "Product"}\n(${variantInfo})`,
        descX,
        y,
        { width: 190 }
      );
      doc.text(qty.toString(), qtyX, y);
      doc.text(`₹${(isInactive ? 0 : finalUnitPrice).toFixed(2)}`, priceX, y);
      doc.text(`₹${lineTotal.toFixed(2)}`, totalX, y);

      y += 30;
    });

    /* ------------------------------------
       SUMMARY
    ------------------------------------ */
    y += 10;
    doc.moveTo(350, y).lineTo(550, y).stroke();
    y += 10;

    doc.fontSize(10);
    doc.text("Subtotal:", 350, y);
    doc.text(`₹${invoiceSubtotal.toFixed(2)}`, totalX, y, { align: "right" });
    y += 18;

    if (order.deliveryCharge > 0) {
      doc.text("Delivery:", 350, y);
      doc.text(`₹${order.deliveryCharge.toFixed(2)}`, totalX, y, { align: "right" });
      y += 18;
    }

    doc.font("Helvetica-Bold");
    doc.text("Total:", 350, y);
    doc.text(
      `₹${(invoiceSubtotal + order.deliveryCharge).toFixed(2)}`,
      totalX,
      y,
      { align: "right" }
    );

    /* ------------------------------------
       FOOTER
    ------------------------------------ */
    doc.font("Helvetica").fontSize(9).fillColor("#666");
    doc.text(
      "Thank you for shopping with Blumeva",
      50,
      doc.page.height - 80,
      { align: "center" }
    );
    doc.text(
      "Support: support@blumeva.com",
      50,
      doc.page.height - 65,
      { align: "center" }
    );

    doc.end();
  } catch (err) {
    console.error("Invoice error:", err);
    res.status(500).send("Error generating invoice");
  }
};




export default {
  loadOrders,
  loadOrderDetail,
  cancelOrderItems,
  requestReturn,
  downloadInvoice,
  placeOrder,
  verifyPayment,
  loadOrderSuccess,
  loadOrderFailure,
  retryPayment,
  deleteTempOrderController,
};

