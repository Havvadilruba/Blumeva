import Order from "../../model/orderSchema.js";
import Address from "../../model/addressSchema.js";
import Cart from "../../model/cartSchema.js";
import Variant from "../../model/variantSchema.js";
import { getCartItems, calculateCartTotals } from "../../services/cartServices.js";
import { orderValidation } from "../../validations/placeOrderValidation.js";

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.json({ success: false, message: "Login required" });

    // Validate request values
    const { error } = orderValidation.validate(req.body);
    if (error) return res.json({ success: false, message: error.message });

    const { addressId, paymentMethod } = req.body;

    // Get cart items
    const items = await getCartItems(userId);
    if (!items.length) return res.json({ success: false, message: "Cart is empty" });

    // Check stock
    for (const item of items) {
      if (item.stock < item.quantity) {
        return res.json({
          success: false,
          message: `${item.product.name} is out of stock`,
        });
      }
    }

    // Get totals
    const totals = calculateCartTotals(items);

    // Fetch selected address
    const address = await Address.findById(addressId);
    if (!address) return res.json({ success: false, message: "Invalid address" });

    // Create order object
    const newOrder = new Order({
      userId,
      addressId,
      orderedItems: items.map((i) => ({
        productId: i.product._id,
        variantId: i.variant._id,
        quantity: i.quantity,
        price: i.salePrice,
      })),
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
      tax:totals.tax,
      subtotal: totals.subtotal,
      discount: totals.discount,
      deliveryCharge: totals.deliveryCharge,
      finalAmount: totals.total,
      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "Pending" : "Paid",
    });

    const savedOrder = await newOrder.save();

    // Clear cart
    await Cart.deleteMany({ userId });

    return res.json({
      success: true,
      orderId: savedOrder.orderId,
      message: "Order placed successfully",
    });

  } catch (err) {
    console.log("Order place error:", err);
    return res.json({ success: false, message: "Order creation failed" });
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
      title: "orderSuccess | Blumeva",
      pageCSS: "/style/user/orderSuccess.css",
         order 
        });

  } catch (err) {
    console.log("Order success page error:", err);
    res.redirect("/pageNotFound");
  }
};


 const loadOrders = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const searchFilter = {
      userId,
      orderId: { $regex: search, $options: "i" },
    };

    const orders = await Order.find(searchFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("orderedItems.productId") // populate product details
      .select("orderId finalAmount orderStatus createdAt expectedDelivery orderedItems"); 

    const totalOrders = await Order.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalOrders / limit);

    res.render("user/orders", {
      layout: "layouts/user",
      title: "My Orders",
      pageCSS: "/style/user/orders.css",
      activePage: "orders",
      orders,
      currentPage: page,
      totalPages,
      search,
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};
 const orderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findOne({ orderId })
      .populate("orderedItems.productId")
      .populate("orderedItems.variantId");

    if (!order) return res.status(404).send("Order not found");

    res.render("user/orderDetails", {
      layout: "layouts/user",
      title: "Order Details",
      pageCSS: "/style/user/orderDetails.css",
      activePage: "orders",
      order,
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading order details");
  }
};


// ---------------------------------------------
// CANCEL ENTIRE ORDER
// ---------------------------------------------
const cancelOrder = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const order = await Order.findOne({ orderId });

    if (!order) return res.json({ success: false, msg: "Order not found" });

    // Check cancel not allowed after shipped or delivered
    if (["Shipped", "Out for Delivery", "Delivered"].includes(order.orderStatus)) {
      return res.json({
        success: false,
        msg: "Order cannot be cancelled after shipping",
      });
    }

    // Increment stock for all items
    for (const item of order.orderedItems) {
      await Variant.findByIdAndUpdate(item.variantId, {
        $inc: { stock: item.quantity },
      });
      item.status = "Cancelled"; // optional per-item status
      item.cancelReason = reason || "";
    }

    order.orderStatus = "Cancelled";
    order.statusTimeline.cancelledAt = new Date();
    order.cancellationReason = reason || "";

    await order.save();

    return res.json({
      success: true,
      msg: "Order cancelled successfully",
    });
  } catch (err) {
    console.log(err);
    return res.json({ success: false, msg: "Something went wrong" });
  }
};

// ---------------------------------------------
// CANCEL SPECIFIC ITEM
// ---------------------------------------------
const cancelItem = async (req, res) => {
  try {
    const { orderId, itemId, reason } = req.body;
    const order = await Order.findOne({ orderId });

    if (!order) return res.json({ success: false, msg: "Order not found" });

    const item = order.orderedItems.id(itemId);
    if (!item) return res.json({ success: false, msg: "Item not found" });

    // Restore stock
    await Variant.findByIdAndUpdate(item.variantId, {
      $inc: { stock: item.quantity },
    });

    item.status = "Cancelled";
    item.cancelReason = reason || "";

    // if all items are cancelled -> cancel entire order
    const remaining = order.orderedItems.filter((i) => i.status !== "Cancelled");
    if (remaining.length === 0) {
      order.orderStatus = "Cancelled";
      order.statusTimeline.cancelledAt = new Date();
    }

    await order.save();
    return res.json({ success: true, msg: "Item cancelled successfully" });
  } catch (err) {
    console.log(err);
    res.json({ success: false, msg: "Something went wrong" });
  }
};

// ---------------------------------------------
// RETURN REQUEST (ORDER OR ITEM)
// ---------------------------------------------
const returnRequest = async (req, res) => {
  try {
    const { orderId, reason, itemId } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) return res.json({ success: false, msg: "Order not found" });

    if (!reason) return res.json({ success: false, msg: "Return reason required" });

    if (itemId) {
      const item = order.orderedItems.id(itemId);
      if (!item) return res.json({ success: false, msg: "Item not found" });

      item.returnStatus = "ReturnRequested";
      item.returnReason = reason;

    } else {
      order.orderStatus = "ReturnRequested";
      order.returnReason = reason;
    }

    await order.save();

    res.json({ success: true, msg: "Return request submitted" });

  } catch (err) {
    console.log(err);
    res.json({ success: false, msg: "Error submitting return request" });
  }
};


export default{
    placeOrder,
    loadOrderSuccess,
    loadOrders,
    orderDetails,
    returnRequest ,
    cancelItem,
    cancelOrder
}