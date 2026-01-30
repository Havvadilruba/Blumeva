import mongoose from "mongoose";
import {
  findOrders,
  countOrders,
  searchUsers,
  findOrderById,
  findRawOrderById,
  updateOrder,
  restoreVariantStock
} from "../repositories/orderRepository.js";
import Wallet from "../model/walletSchema.js";
import { createLedgerEntry } from "../repositories/walletLedgerRepository.js";
import { updateUserWalletBalance } from "../repositories/userRepository.js";

export const getOrderListService = async (search, statusFilter, paymentFilter, page, limit) => {
   let query = {};
 
  const skip = (page - 1) * limit;

  if (search) {
    const users = await searchUsers(search);
    const userIds = users.map((u) => u._id);

    query.$or = [
      { orderId: { $regex: search, $options: "i" } },
      { userId: { $in: userIds } }
    ];
  }

  if (statusFilter) query.orderStatus = statusFilter;
  if (paymentFilter) query.paymentMethod = paymentFilter;

  const orders = await findOrders(query, skip, limit);
  const totalOrders = await countOrders(query);

  return {
    orders,
    totalOrders,
    totalPages: Math.ceil(totalOrders / limit)
  };
};

export const getOrderDetailService = async (id) => {
  return await findOrderById(id);
};

export const updateOrderStatusService = async (id, status) => {
  const order = await findRawOrderById(id);
  if (!order) return { success: false, message: "Order not found" };

  const now = new Date();

  const statusFlow = [
    "Pending",
    "Confirmed",
    "Processing",
    "Shipped",
    "Out for Delivery",
    "Delivered",
  ];

  const timelineMap = {
    Confirmed: "confirmedAt",
    Processing: "processedAt",
    Shipped: "shippedAt",
    "Out for Delivery": "outForDeliveryAt",
    Delivered: "deliveredAt",
    Cancelled: "cancelledAt",
    Returned: "returnedAt",
  };

  const validStatuses = [
    ...statusFlow,
    "Cancelled",
    "Returned",
    "Partially Delivered",
    "Partially Cancelled",
    "Partially Returned",
  ];

  if (!validStatuses.includes(status)) {
    return { success: false, message: "Invalid order status" };
  }

  if (!order.statusTimeline) order.statusTimeline = {};

  // full cancellation logic
  if (status === "Cancelled") {
    order.orderStatus = status;
    order.statusTimeline.cancelledAt = now;

    order.orderedItems.forEach((item) => {
      if (item.itemStatus !== "Cancelled") {
        item.itemStatus = "Cancelled";
        if (!item.itemTimeline) item.itemTimeline = {};
        item.itemTimeline.cancelledAt = now;
      }
    });

    await updateOrder(order);
    return { success: true, order };
  }

  // return all items logic
  if (status === "Returned") {
    order.orderStatus = status;
    order.statusTimeline.returnedAt = now;

    order.orderedItems.forEach((item) => {
      item.itemStatus = "Returned";
      if (!item.itemTimeline) item.itemTimeline = {};
      item.itemTimeline.returnedAt = now;
    });

    await updateOrder(order);
    return { success: true, order };
  }

  // timeline updates for normal flow
  const newIndex = statusFlow.indexOf(status);
  if (newIndex !== -1) {
    for (let i = 1; i <= newIndex; i++) {
      const step = statusFlow[i];
      const key = timelineMap[step];
      if (key && !order.statusTimeline[key]) {
        order.statusTimeline[key] = now;
      }
    }
  }

  order.orderStatus = status;

  order.orderedItems.forEach((item) => {
    if (!["Cancelled", "Returned", "ReturnApproved", "ReturnRequested"].includes(item.itemStatus)) {
      item.itemStatus = status;
      if (!item.itemTimeline) item.itemTimeline = {};
    }
  });

  if (status === "Delivered") {
  order.deliveredDate = now;

  order.orderedItems.forEach(item => {
    if (!item.itemTimeline) item.itemTimeline = {};
    item.itemTimeline.deliveredAt = now;
  });

  
  if (order.paymentStatus === "Pending") {
    order.paymentStatus = "Paid";
  }
}


  order.markModified("statusTimeline");
  order.markModified("orderedItems");

  await updateOrder(order);
  return { success: true, order };
};

export const handleReturnRequestService = async (id, itemId, action, adminNote) => {
  const order = await findRawOrderById(id);
  if (!order) return { success: false, message: "Order not found" };

  const item = order.orderedItems.id(itemId);
  if (!item) return { success: false, message: "Item not found" };

  if (item.itemStatus !== "ReturnRequested") {
    return { success: false, message: "Cannot approve/reject" };
  }

  const now = new Date();

  if (action === "approve") {
    item.itemStatus = "ReturnApproved";
    if (!item.itemTimeline) item.itemTimeline = {};
    item.itemTimeline.returnApprovedAt = now;
    if (adminNote) item.adminNote = adminNote;
  } else {
    item.itemStatus = "ReturnRejected";
    if (!item.itemTimeline) item.itemTimeline = {};
    item.itemTimeline.returnRejectedAt = now;
    if (adminNote) item.adminNote = adminNote;
  }

  order.markModified("orderedItems");
  await updateOrder(order);

  return { success: true, order };
};

export const markItemReturnedService = async (id, itemId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await findRawOrderById(id)
      .populate("orderedItems.variantId")
      .session(session);

    if (!order) {
      await session.abortTransaction();
      return { success: false, message: "Order not found" };
    }

    const item = order.orderedItems.id(itemId);
    if (!item) {
      await session.abortTransaction();
      return { success: false, message: "Item not found" };
    }

    if (item.itemStatus !== "ReturnApproved") {
      await session.abortTransaction();
      return {
        success: false,
        message: "Only approved returns can be marked as returned",
      };
    }

    // ❗ Prevent double refund
    if (item.refundProcessed) {
      await session.abortTransaction();
      return { success: false, message: "Refund already processed" };
    }

    const now = new Date();

    /* ------------------------------------
       1. Restore stock
    ------------------------------------ */
    if (item.variantId && item.variantId._id) {
      await restoreVariantStock(item.variantId._id, item.quantity, session);
    }

    /* ------------------------------------
       2. Update item status
    ------------------------------------ */
    item.itemStatus = "Returned";
    item.itemTimeline = item.itemTimeline || {};
    item.itemTimeline.returnedAt = now;

    /* ------------------------------------
       3. Accurate refund calculation
    ------------------------------------ */
    const salePrice = item.salePrice || 0;
    const discountAmount = item.discountAmount || 0;
    const couponShare = item.couponShare || 0;
    const quantity = item.quantity || 1;

    const couponPerUnit = couponShare / quantity;

    const finalPricePerUnit =
      salePrice - discountAmount - couponPerUnit;

    let refundAmount =
      Math.round(finalPricePerUnit * quantity * 100) / 100;

    if (refundAmount < 0) refundAmount = 0;

    /* ------------------------------------
       4. Process refund (wallet)
    ------------------------------------ */
    if (order.paymentStatus === "Paid" && refundAmount > 0) {
      const wallet = await Wallet.findOneAndUpdate(
        { userId: order.userId },
        {
          $inc: {
            balance: refundAmount,
            totalCredits: refundAmount,
          },
          $set: { lastTransactionAt: now },
        },
        { new: true, session }
      );

      if (!wallet) {
        await session.abortTransaction();
        return { success: false, message: "User wallet not found" };
      }

      await createLedgerEntry(
        {
          walletId: wallet._id,
          userId: order.userId,
          amount: refundAmount,
          type: "REFUND",
          referenceId: order._id,
          note: `Refund for returned item in order ${order.orderId}`,
          balanceAfter: wallet.balance,
        },
        session
      );

      await updateUserWalletBalance(order.userId, wallet.balance, session);

      item.refundProcessed = true;
    }

    /* ------------------------------------
       5. Update order status
    ------------------------------------ */
    const returnedItems = order.orderedItems.filter(
      (i) => i.itemStatus === "Returned"
    ).length;

    const totalItems = order.orderedItems.length;

    if (returnedItems === totalItems && totalItems > 0) {
      order.orderStatus = "Returned";
      order.statusTimeline = order.statusTimeline || {};
      order.statusTimeline.returnedAt = now;
    } else if (returnedItems > 0) {
      order.orderStatus = "Partially Returned";
    }

    order.markModified("orderedItems");
    order.markModified("statusTimeline");
    await order.save({ session });

    await session.commitTransaction();

    return {
      success: true,
      order,
      refund: refundAmount,
      message: `Item marked as returned. Refund of ₹${refundAmount.toFixed(
        2
      )} processed to wallet.`,
    };
  } catch (error) {
    console.error("Mark item returned error:", error);
    await session.abortTransaction();
    return {
      success: false,
      message: error.message || "Failed to mark item as returned",
    };
  } finally {
    session.endSession();
  }
};
