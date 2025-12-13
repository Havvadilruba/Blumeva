import Order from "../../model/orderSchema.js";
import Address from "../../model/addressSchema.js";
import Cart from "../../model/cartSchema.js";
import Variant from "../../model/variantSchema.js";
import { getCartItems, calculateCartTotals } from "../../services/cartServices.js";
import { orderValidation } from "../../validations/placeOrderValidation.js";
import Product from "../../model/productSchema.js";
import { couponUsageCreate } from "../../repositories/couponUsageRepository.js";
import Coupon from "../../model/couponSchema.js";
import {
  findWalletByUserId,
  updateWalletBalance,
  updateWalletHoldBalance,
  updateWalletTotalDebits,
  saveWallet,
} from "../../repositories/walletRepository.js";
import mongoose from "mongoose";
import {
  createLedgerEntry,
} from "../../repositories/walletLedgerRepository.js";
import {
  createHoldRecord,
  updateHoldStatus,
} from "../../repositories/walletHoldRepository.js";
import Wallet from "../../model/walletSchema.js";
import { updateUserWalletBalance } from "../../repositories/userRepository.js";

const decrementVariantStock = (variantId, qty, session) => {
  return Variant.updateOne(
    { _id: variantId, stock: { $gte: qty } },
    { $inc: { stock: -qty } },
    { session }
  );
};

const incrementVariantStock = (variantId, qty, session) => {
  return Variant.updateOne(
    { _id: variantId },
    { $inc: { stock: qty } },
    { session }
  );
};

const placeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.session.user?._id;
    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const { error } = orderValidation.validate(req.body);
    if (error) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: error.message });
    }

    const { addressId, paymentMethod } = req.body;

    // fetch items & totals
    const items = await getCartItems(userId);
    if (!items || !items.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const totals = calculateCartTotals(items);
    const appliedCoupon = req.session.appliedCoupon || null;

    //  final amount
    let finalAmount = totals.total;
    if (appliedCoupon) finalAmount = finalAmount - (appliedCoupon.discount || 0);

    // address
    const address = await Address.findById(addressId).session(session);
    if (!address) {
      throw { status: 400, message: "Invalid address" };
    }

    // Expected delivery
    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() + 5);

    // 1) reduce stock 
    for (const item of items) {
      const result = await decrementVariantStock(item.variant._id, item.quantity, session);
      if (!result || result.modifiedCount === 0) {
        throw { status: 400, message: `Insufficient stock for product ${item.product.name}` };
      }
    }

    // Prepare ordered items
    const orderedItems = items.map((item) => ({
      productId: item.product._id,
      variantId: item.variant._id,
      quantity: item.quantity,
      regularPrice: item.regularPrice,
      salePrice: item.salePrice,
      discountAmount: item.discountAmount || 0,
      price: item.salePrice || item.regularPrice || 0,
    }));

    // 2) create order (inside txn)
    const orderPayload = {
      userId,
      addressId,
      orderedItems,
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country,
        addressType: address.addressType,
      },
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      deliveryCharge: totals.deliveryCharge,
      couponDiscount: appliedCoupon?.discount || 0,
      couponId: appliedCoupon?.couponId || null,
      finalAmount,
      paymentMethod,
      paymentStatus: paymentMethod === "wallet" ? "Pending" : (paymentMethod === "cod" ? "Pending" : "Paid"),
      expectedDelivery,
    };

    const createdOrders = await Order.create([orderPayload], { session });
    const savedOrder = createdOrders[0];

    // 3) create coupon usage & increment 
    if (appliedCoupon) {
      try {
        // try to call repo with session if it accepts it
        await couponUsageCreate(
          appliedCoupon.couponId,
          userId,
          savedOrder._id, 
          appliedCoupon.discount,
          session);
      } catch (e) {
        try {
          await couponUsageCreate(
            appliedCoupon.couponId, 
            userId, 
            savedOrder._id, 
            appliedCoupon.discount);
        } catch (err) {
          console.warn('couponUsageCreate failed', err);
        }
      }

      await Coupon.findByIdAndUpdate(
        appliedCoupon.couponId,
         { 
          $inc:
           { 
            currentUsageCount: 1 
          } 
        },
         {
           session 
          });
    }

    //  WALLET: HOLD
    let holdRecord = null;
    if (paymentMethod === "wallet") {
      const wallet = await findWalletByUserId(userId, session);
      if (!wallet || (wallet.balance - wallet.holdBalance) < finalAmount) {
        throw { status: 400, message: "Insufficient wallet balance" };
      }

      // increase hold balance
      await updateWalletHoldBalance(userId,finalAmount, session);

      // create hold
      const [hold] = await createHoldRecord({ 
        userId, 
        walletId: wallet._id, 
        orderId: savedOrder._id, 
        amount: finalAmount, 
        status: "HELD" }, 
        session);

      holdRecord = hold;

      // ledger: HOLD
      await createLedgerEntry({ 
        walletId: wallet._id, 
        userId, amount: finalAmount, 
        type: "HOLD", 
        referenceId: savedOrder._id, 
        note: "Wallet amount reserved for order", 
        balanceAfter: wallet.balance }, 
        session);
    }

    // Clear cart 
    await Cart.deleteMany({ userId }).session(session);

    //  CAPTURE wallet
    if (paymentMethod === "wallet") {
      try {
        const wallet = await findWalletByUserId(userId, session);

        // reduce holdBalance and reduce actual balance
        await updateWalletHoldBalance(userId, -finalAmount, session);
        await updateWalletBalance(userId, -finalAmount, session);

        const newBalance = wallet.balance - finalAmount;

        // update total debits
        await updateWalletTotalDebits(userId, finalAmount, session);

        // update hold status
        await updateHoldStatus(holdRecord._id, "CAPTURED", session);

        // ledger: DEBIT entry (positive amount)
        await createLedgerEntry({ 
          walletId: wallet._id, 
          userId, 
          amount: finalAmount, 
          type: "DEBIT", 
          referenceId: savedOrder._id, 
          note: `Wallet payment captured for order: ${savedOrder._id}`, 
          balanceAfter: newBalance }, 
          session);

        // update user snapshot
        await updateUserWalletBalance(userId, newBalance, session);

        // mark order paid
        await Order.findByIdAndUpdate(savedOrder._id, { paymentStatus: "Paid" }, { session });

      } catch (err) {
        // capture failed — release hold, restore stock and abort
        try {
          await updateWalletHoldBalance(userId, -finalAmount, session);
          if (holdRecord && holdRecord._id) await updateHoldStatus(holdRecord._id, "RELEASED", session);

          // ledger: RELEASE entry
          if (holdRecord) {
            await createLedgerEntry({ walletId: holdRecord.walletId, userId, amount: finalAmount, type: "RELEASE", referenceId: savedOrder._id, note: "Wallet capture failed → Hold released" }, session);
          }

          // restore stock
          for (const item of orderedItems) {
            await incrementVariantStock(item.variantId, item.quantity, session);
          }

        } catch (innerErr) {
          console.error('Error during wallet capture rollback:', innerErr);
        }

        throw { status: 400, message: "Wallet payment failed" };
      }
    }

    // 7) commit txn
    await session.commitTransaction();
    session.endSession();

    // clear applied coupon in session
    req.session.appliedCoupon = null;

    return res.status(200).json({ success: true, orderId: savedOrder.orderId, message: "Order placed successfully" });

  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (e) {
      // ignore
    }
    session.endSession();

    console.error('placeOrder error:', err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Order creation failed' });
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

    // Loop selected items
    for (const itemIdStr of itemIds) {
      const item = order.orderedItems.id(itemIdStr);
      if (!item) continue;

      if (!cancellable.includes(item.itemStatus)) continue;

      // Mark cancelled
      item.itemStatus = "Cancelled";
      item.reason = reason || "";
      item.itemTimeline = item.itemTimeline || {};
      item.itemTimeline.cancelledAt = now;

      // Restore stock (session-safe)
      await Variant.updateOne(
        { _id: item.variantId._id },
        { $inc: { stock: item.quantity } },
        { session }
      );

      cancelledCount++;

      // Wallet refund calculation
      if (order.paymentMethod === "wallet" && order.paymentStatus === "Paid") {
        const itemRefund = item.salePrice * item.quantity;
        refundAmount += itemRefund;
      }
    }

    // NO CANCELLATION?
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

    // Process wallet refund (inside transaction)
    if (refundAmount > 0) {
      const wallet = await Wallet.findOne({ userId }).session(session);

      await Wallet.updateOne(
        { userId },
        { 
          $inc: { balance: refundAmount, totalCredits: refundAmount },
          lastTransactionAt: now
        },
        { session }
      );

      const newBal = wallet.balance + refundAmount;

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
    if (!userId) {
      return res.redirect("/login");
    }

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

    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Only allow invoice download for completed/finalized orders
    const allowedStatuses = [
      "Delivered", 
      "Cancelled", 
      "Returned", 
      "Partially Returned",
      "Partially Cancelled",
      "Partially Delivered"
    ];
    if (!allowedStatuses.includes(order.orderStatus)) {
      return res.status(400).send("Invoice not available for this order status");
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${order.orderId}.pdf`
    );

    doc.pipe(res);

    // Company Header
    doc.fontSize(24).font("Helvetica-Bold").text("BLUMEVA", { align: "center" });
    doc.fontSize(10).font("Helvetica").text("Face Care", { align: "center" });
    doc.moveDown();

    // Invoice Title
    doc.fontSize(20).font("Helvetica-Bold").text("INVOICE", { align: "center" });
    doc.moveDown();

    // Order Information
    doc.fontSize(10).font("Helvetica");
    doc.text(`Invoice Number: ${order.orderId}`, 50);
    doc.text(
      `Invoice Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`,
      50
    );
    doc.text(`Payment Method: ${order.paymentMethod.toUpperCase()}`, 50);
    doc.text(`Payment Status: ${order.paymentStatus}`, 50);
    doc.moveDown();

    // Billing and Shipping Information
    const leftColumn = 50;
    const rightColumn = 300;
    let currentY = doc.y;

    doc.fontSize(12).font("Helvetica-Bold").text("Bill To:", leftColumn, currentY);
    doc.fontSize(10).font("Helvetica");
    doc.text(order.userId?.name || "N/A", leftColumn, currentY + 20);
    doc.text(order.userId?.email || "N/A", leftColumn, currentY + 35);

    doc.fontSize(12).font("Helvetica-Bold").text("Ship To:", rightColumn, currentY);
    doc.fontSize(10).font("Helvetica");
    doc.text(order.shippingAddress?.fullName || "", rightColumn, currentY + 20);
    doc.text(order.shippingAddress?.phone || "", rightColumn, currentY + 35);
    doc.text(order.shippingAddress?.address1 || "", rightColumn, currentY + 50, {
      width: 200,
    });
    if (order.shippingAddress?.address2) {
      doc.text(order.shippingAddress.address2, rightColumn, currentY + 65, {
        width: 200,
      });
    }
    doc.text(
      `${order.shippingAddress?.city}, ${order.shippingAddress?.state}`,
      rightColumn,
      currentY + 80
    );
    doc.text(
      `${order.shippingAddress?.pincode}, ${order.shippingAddress?.country}`,
      rightColumn,
      currentY + 95
    );

    doc.moveDown(8);

    // Items Table
    const tableTop = doc.y + 20;
    const itemX = 50;
    const descX = 150;
    const qtyX = 350;
    const priceX = 400;
    const totalX = 480;

    doc.fontSize(10).font("Helvetica-Bold").fillColor("#333");
    doc.rect(50, tableTop - 5, 500, 25).fillAndStroke("#f0f0f0", "#ddd");
    
    doc.fillColor("#000");
    doc.text("#", itemX, tableTop + 5);
    doc.text("Description", descX, tableTop + 5);
    doc.text("Qty", qtyX, tableTop + 5);
    doc.text("Price", priceX, tableTop + 5);
    doc.text("Total", totalX, tableTop + 5);

    doc.font("Helvetica");
    let yPosition = tableTop + 30;
    let itemNumber = 1;

    order.orderedItems.forEach((item) => {
      const productName = item.productId?.name || "Product";
      const variantInfo = item.variantId
        ? `${item.variantId.quantityValue}${item.variantId.quantityType}`
        : "";
      const itemTotal = item.price * item.quantity;

      doc.fontSize(9);
      doc.text(itemNumber.toString(), itemX, yPosition);
      doc.text(`${productName}\n(${variantInfo})`, descX, yPosition, {
        width: 180,
      });
      doc.text(item.quantity.toString(), qtyX, yPosition);
      doc.text(`₹${item.price.toFixed(2)}`, priceX, yPosition);
      doc.text(`₹${itemTotal.toFixed(2)}`, totalX, yPosition);

      yPosition += 35;
      itemNumber++;

      doc.moveTo(50, yPosition - 5).lineTo(550, yPosition - 5).stroke("#e0e0e0");
    });

    // Summary
    yPosition += 20;
    const summaryX = 380;

    doc.fontSize(10).font("Helvetica");
    doc.text("Subtotal:", summaryX, yPosition);
    doc.text(`₹${order.subtotal.toFixed(2)}`, totalX, yPosition, { align: "right" });
    yPosition += 20;

    if (order.discount > 0) {
      doc.fillColor("#16a34a");
      doc.text("Discount:", summaryX, yPosition);
      doc.text(`-₹${order.discount.toFixed(2)}`, totalX, yPosition, { align: "right" });
      doc.fillColor("#000");
      yPosition += 20;
    }

    if (order.tax > 0) {
      doc.text("Tax:", summaryX, yPosition);
      doc.text(`₹${order.tax.toFixed(2)}`, totalX, yPosition, { align: "right" });
      yPosition += 20;
    }

    doc.text("Delivery Charge:", summaryX, yPosition);
    doc.text(
      order.deliveryCharge === 0 ? "FREE" : `₹${order.deliveryCharge.toFixed(2)}`,
      totalX,
      yPosition,
      { align: "right" }
    );
    yPosition += 20;

    doc.moveTo(summaryX, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 10;

    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("Total Amount:", summaryX, yPosition);
    doc.text(`₹${order.finalAmount.toFixed(2)}`, totalX, yPosition, {
      align: "right",
    });

    // Footer
    doc.fontSize(9).font("Helvetica").fillColor("#666")
      .text("Thank you for shopping with Blumeva!", 50, doc.page.height - 80, {
        align: "center",
      });
    doc.text("For queries, contact: support@blumeva.com", 50, doc.page.height - 65, {
      align: "center",
    });

    doc.end();
  } catch (error) {
    console.error("Download invoice error:", error);
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
    loadOrderSuccess,
};

