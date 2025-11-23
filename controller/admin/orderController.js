import Order from "../../model/orderSchema.js";
import User from "../../model/userSchema.js";

const loadOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Orders per page
    const skip = (page - 1) * limit;

    // Filters
    const search = req.query.search?.trim() || "";
    const statusFilter = req.query.status || "";
    const paymentStatusFilter = req.query.paymentStatus || "";
    const sortFilter = req.query.sort || "recent";

    let query = {};

    // Search by orderId / userName / email
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { "userId.name": { $regex: search, $options: "i" } },
        { "userId.email": { $regex: search, $options: "i" } }
      ];
    }

    if (statusFilter) query.orderStatus = statusFilter;
    if (paymentStatusFilter) query.paymentStatus = paymentStatusFilter;

    // Sorting
    let sort = {};
    if (sortFilter === "recent") sort = { createdAt: -1 };
    else if (sortFilter === "oldest") sort = { createdAt: 1 };
    else if (sortFilter === "amount-high") sort = { finalAmount: -1 };
    else if (sortFilter === "amount-low") sort = { finalAmount: 1 };

    // Orders Data with pagination
    const orders = await Order.find(query)
      .populate("userId", "name email")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    // Analytics from DB
    const allOrders = await Order.find();
    const analytics = {
      totalOrders: await Order.countDocuments(),
      activeOrders: await Order.countDocuments({ orderStatus: { $nin: ["Delivered", "Cancelled", "Returned"] } }),
      returnedOrders: await Order.countDocuments({ orderStatus: "Returned" }),
      cancelledOrders: await Order.countDocuments({ orderStatus: "Cancelled" }),
      totalRevenue: allOrders.reduce((sum, o) => sum + (o.paymentStatus === "Paid" ? o.finalAmount : 0), 0),
    };

    res.render("admin/orders", {
        layout: "layouts/admin",
      title: "Orders",
      pageCSS: "orders",
      activePage: "orders",
      orders,
      analytics,
      currentPage: page,
      totalPages,
      limit,
      totalOrders,

      // keep filter states
      statusFilter,
      paymentStatusFilter,
      sortFilter,
      searchQuery: search,
    });

  } catch (error) {
    console.log("Load Orders Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

 const loadOrderDetails = async (req, res) => {
  const id = req.params.id;

  const order = await Order.findById(id)
    .populate("userId")
    .populate("orderedItems.productId")
    .populate("orderedItems.variantId");

  res.render("admin/orderDetails", {
    layout: "layouts/admin",
      title: "OrderDetails",
      pageCSS: "orderDetail",
      activePage: "orders",
    order
  });
};
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const now = new Date();
    if (!order.statusTimeline) order.statusTimeline = {};
    const timeline = order.statusTimeline;

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

    // BUSINESS RULE: CANCEL ONLY BEFORE SHIPPING
    if (status === "Cancelled") {
      if (timeline.shippedAt) {
        return res.status(400).json({
          success: false,
          message: "Order cannot be cancelled after shipping has started",
        });
      }

      timeline.cancelledAt = now;
      order.orderStatus = status;

      order.orderedItems.forEach((item) => {
        item.itemStatus = "Cancelled";
        if (!item.itemTimeline) item.itemTimeline = {};
        item.itemTimeline.cancelledAt = now;
      });

      await order.save();
      return res.json({ success: true, message: "Order cancelled successfully", order });
    }

    // BUSINESS RULE: RETURN ONLY AFTER DELIVERED
    if (status === "Returned") {
      if (!timeline.deliveredAt) {
        return res.status(400).json({
          success: false,
          message: "Return can only be initiated after delivery",
        });
      }

      timeline.returnedAt = now;
      order.orderStatus = status;

      order.orderedItems.forEach((item) => {
        item.itemStatus = "Returned";
        if (!item.itemTimeline) item.itemTimeline = {};
        item.itemTimeline.returnedAt = now;
      });

      await order.save();
      return res.json({ success: true, message: "Order returned successfully", order });
    }

    // NORMAL FLOW HANDLING
    const newIndex = statusFlow.indexOf(status);

    if (newIndex !== -1) {
      for (let i = 1; i <= newIndex; i++) {
        const step = statusFlow[i];
        const key = timelineMap[step];
        if (key && !timeline[key]) timeline[key] = now;
      }
    }

    order.orderStatus = status;

    // EXPECTED DELIVERY +5 DAYS WHEN CONFIRMED OR SHIPPED
    if (status === "Confirmed" || status === "Shipped") {
      const expected = new Date();
      expected.setDate(expected.getDate() + 5);
      order.expectedDelivery = expected;
    }

    // SET ACTUAL DELIVERY DATE
    if (status === "Delivered") {
      order.deliveredDate = now;
    }

    order.markModified("statusTimeline");
    order.markModified("orderedItems");

    await order.save();

    res.json({
      success: true,
      message: "Order status updated successfully",
      order,
    });

  } catch (error) {
    console.log("Error updating order:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export default{
    loadOrders,
    loadOrderDetails,
    updateOrderStatus
}