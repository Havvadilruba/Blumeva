import {
  findOrders,
  countOrders,
  searchUsers,
  findOrderById,
  findRawOrderById,
  updateOrder,
  restoreVariantStock
} from "../repositories/orderRepository.js";

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

  if (status === "Delivered") order.deliveredDate = now;

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
  const order = await findRawOrderById(id).populate("orderedItems.variantId");
  if (!order) return { success: false, message: "Order not found" };

  const item = order.orderedItems.id(itemId);
  if (!item) return { success: false, message: "Item not found" };

  if (item.itemStatus !== "ReturnApproved") {
    return { success: false, message: "Only approved returns allowed" };
  }

  const now = new Date();

  if (item.variantId && item.variantId._id) {
    await restoreVariantStock(item.variantId._id, item.quantity);
  }

  item.itemStatus = "Returned";
  if (!item.itemTimeline) item.itemTimeline = {};
  item.itemTimeline.returnedAt = now;

  order.markModified("orderedItems");
  order.markModified("statusTimeline");
  await updateOrder(order);

  return { success: true, order };
};
