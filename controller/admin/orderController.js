import Order from "../../model/orderSchema.js";
import User from "../../model/userSchema.js";
import Variant from "../../model/variantSchema.js";

const loadOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const statusFilter = req.query.status || "";
    const paymentFilter = req.query.payment || "";  
    let query = {};

    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      const userIds = users.map((u) => u._id);

      query.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { userId: { $in: userIds } },
      ];
    }

    if (statusFilter) {
      query.orderStatus = statusFilter;
    }
    if (paymentFilter) query.paymentMethod = paymentFilter;
    
    const orders = await Order.find(query)
      .populate("userId", "name email")
      .skip(skip)
      .limit(limit)
      .lean();

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    res.render("admin/orders", {
      layout: "layouts/admin",
      title: "Orders | Admin",
      pageCSS: "orders",
      activePage: "orders",
      orders,
      currentPage: page,
      totalPages,
      totalOrders,
      search,
      paymentFilter,  
      statusFilter,
      limit,
    });
  } catch (err) {
    console.error("Load orders error:", err);
    res.redirect("/admin/pageNotFound");
  }
};

const loadOrderDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate("userId", "name email phone")
      .populate({
        path: "orderedItems.productId",
        model: "Product",
      })
      .populate({
        path: "orderedItems.variantId",
        model: "Variant",
      })
      .lean();

    if (!order) {
      return res.redirect("/admin/pageNotFound");
    }

    res.render("admin/orderDetails", {
      layout: "layouts/admin",
      title: `Order ${order.orderId} | Admin`,
      pageCSS: "orderDetail",
      activePage: "orders",
      order,
    });
  } catch (err) {
    console.error("Load order detail error:", err);
    res.redirect("/admin/pageNotFound");
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const now = new Date();

    if (!order.statusTimeline) {
      order.statusTimeline = {};
    }

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

    const validStatuses = [
      ...statusFlow,
      "Cancelled",
      "Returned",
      "Partially Delivered",
      "Partially Cancelled",
      "Partially Returned",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    if (status === "Cancelled") {
      timeline.cancelledAt = now;
      order.orderStatus = status;

      order.orderedItems.forEach((item) => {
        if (item.itemStatus !== "Cancelled") {
          item.itemStatus = "Cancelled";
          if (!item.itemTimeline) item.itemTimeline = {};
          item.itemTimeline.cancelledAt = now;
        }
      });

      await order.save();
      return res.json({
        success: true,
        message: "Order cancelled successfully",
        order,
      });
    }

    if (status === "Returned") {
      timeline.returnedAt = now;
      order.orderStatus = status;

      order.orderedItems.forEach((item) => {
        if (item.itemStatus !== "Returned") {
          item.itemStatus = "Returned";
          if (!item.itemTimeline) item.itemTimeline = {};
          item.itemTimeline.returnedAt = now;
        }
      });

      await order.save();
      return res.json({
        success: true,
        message: "Order marked as returned",
        order,
      });
    }

    const newIndex = statusFlow.indexOf(status);

    if (newIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Invalid status for automatic timeline update",
      });
    }

    for (let i = 1; i <= newIndex; i++) {
      const step = statusFlow[i];
      const key = timelineMap[step];

      if (key && !timeline[key]) {
        timeline[key] = now;
      }
    }

    order.orderStatus = status;

    order.orderedItems.forEach((item) => {
      if (
        item.itemStatus !== "Cancelled" &&
        item.itemStatus !== "Returned" &&
        item.itemStatus !== "ReturnApproved" &&
        item.itemStatus !== "ReturnRequested"
      ) {
        item.itemStatus = status;

        if (!item.itemTimeline) {
          item.itemTimeline = {};
        }

        if (status === "Confirmed" && !item.itemTimeline.confirmedAt) {
          item.itemTimeline.confirmedAt = now;
        } else if (status === "Processing" && !item.itemTimeline.processedAt) {
          item.itemTimeline.processedAt = now;
        } else if (status === "Shipped" && !item.itemTimeline.shippedAt) {
          item.itemTimeline.shippedAt = now;
        } else if (status === "Delivered" && !item.itemTimeline.deliveredAt) {
          item.itemTimeline.deliveredAt = now;
        }
      }
    });

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
    console.log("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating order status",
    });
  }
};



const handleReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemId, action, adminNote } = req.body;

    if (!itemId || !action) {
      return res
        .status(400)
        .json({ success: false, message: "Missing itemId or action" });
    }

    const validActions = ["approve", "reject"];
    if (!validActions.includes(action)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid action" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const item = order.orderedItems.id(itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    const now = new Date();

    if (item.itemStatus !== "ReturnRequested") {
      return res.status(400).json({
        success: false,
        message: "cant approved/rejected",
      });
    }

    if (action === "approve") {
      item.itemStatus = "ReturnApproved";
      if (!item.itemTimeline) item.itemTimeline = {};
      item.itemTimeline.returnApprovedAt = now;
      if (adminNote) item.adminNote = adminNote;
    } else if (action === "reject") {
      item.itemStatus = "ReturnRejected";
      if (!item.itemTimeline) item.itemTimeline = {};
      item.itemTimeline.returnRejectedAt = now;
      if (adminNote) item.adminNote = adminNote;
    }

    // Only update order status based
    const actuallyReturnedItems = order.orderedItems.filter(
      (i) => i.itemStatus === "Returned"
    );
    const allItemsReturned = order.orderedItems.every(
      (i) => i.itemStatus === "Returned"
    );

    if (allItemsReturned) {
      order.orderStatus = "Returned";
      if (!order.statusTimeline) order.statusTimeline = {};
      order.statusTimeline.returnedAt = now;
    } else if (actuallyReturnedItems.length > 0) {
      order.orderStatus = "Partially Returned";
    }

    order.markModified("orderedItems");
    await order.save();

    return res.json({
      success: true,
      message: `Return request ${action}d successfully`,
      order,
    });
  } catch (error) {
    console.error("Handle return request error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while processing return request",
    });
  }
};


const markItemReturned = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemId } = req.body;

    if (!itemId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing itemId" });
    }

    const order = await Order
    .findById(id)
    .populate("orderedItems.variantId");
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const item = order.orderedItems.id(itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    if (item.itemStatus !== "ReturnApproved") {
      return res.status(400).json({
        success: false,
        message: "Only approved returns can ",
      });
    }

    const now = new Date();

    if (item.variantId && item.variantId._id) {
      await Variant.findByIdAndUpdate(
        item.variantId._id,
        { $inc: { stock: item.quantity } },
        { new: true }
      );
    }

    item.itemStatus = "Returned";
    if (!item.itemTimeline) item.itemTimeline = {};
    item.itemTimeline.returnedAt = now;

    // Update order status 
    const allReturned = order.orderedItems.every(
      (i) => i.itemStatus === "Returned"
    );
    const someReturned = order.orderedItems.some(
      (i) => i.itemStatus === "Returned"
    );

    if (allReturned) {
      order.orderStatus = "Returned";
      if (!order.statusTimeline) order.statusTimeline = {};
      order.statusTimeline.returnedAt = now;
    } else if (someReturned) {
      order.orderStatus = "Partially Returned";
    }

    order.markModified("orderedItems");
    order.markModified("statusTimeline");
    await order.save();

    return res.json({
      success: true,
      message: "Item marked as returned and stock restored successfully",
      order,
    });
  } catch (error) {
    console.error("Mark item returned error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while marking item as returned",
    });
  }
};

export default {
  loadOrders,
  loadOrderDetail,
  updateOrderStatus, 
  handleReturnRequest,
  markItemReturned,
};