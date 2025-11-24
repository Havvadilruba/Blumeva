import Order from "../../model/orderSchema.js";
import Address from "../../model/addressSchema.js";
import Cart from "../../model/cartSchema.js";
import Variant from "../../model/variantSchema.js";
import { getCartItems, calculateCartTotals } from "../../services/cartServices.js";
import { orderValidation } from "../../validations/placeOrderValidation.js";
import Product from "../../model/productSchema.js";
import PDFDocument from "pdfkit";


const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.json({ success: false, message: "Login required" });
    }

    const { error } = orderValidation.validate(req.body);
    if (error) {
      return res.json({ success: false, message: error.message });
    }

    const { addressId, paymentMethod } = req.body;

    const items = await getCartItems(userId);
    if (!items.length) {
      return res.json({ success: false, message: "Cart is empty" });
    }

    for (const item of items) {
      const variant = await Variant.findById(item.variant._id);
      if (!variant || variant.stock < item.quantity) {
        return res.json({
          success: false,
          message: `${item.product.name} has insufficient stock`,
        });
      }
    }

    const totals = calculateCartTotals(items);
    const address = await Address.findById(addressId);
    if (!address) {
      return res.json({ success: false, message: "Invalid address" });
    }

    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() + 5);

    const newOrder = new Order({
      userId,
      addressId,
      
      orderedItems: items.map((item) => ({
        productId: item.product._id,
        variantId: item.variant._id,
        quantity: item.quantity,
        price: item.salePrice,
        itemStatus: "Pending",
        itemTimeline: {}, 
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

      orderStatus: "Pending",
      statusTimeline: {}, 

      
      tax: totals.tax,
      subtotal: totals.subtotal,
      discount: totals.discount,
      deliveryCharge: totals.deliveryCharge,
      finalAmount: totals.total,

      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "Pending" : "Paid",

      expectedDelivery,
    });

    const savedOrder = await newOrder.save();

    for (const item of items) {
      await Variant.findByIdAndUpdate(
        item.variant._id,
        { $inc: { stock: -item.quantity } }, 
        { new: true }
      );
    }

    await Cart.deleteMany({ userId });

    return res.json({
      success: true,
      orderId: savedOrder.orderId,
      message: "Order placed successfully",
    });

  } catch (err) {
    console.error("Order place error:", err);
    return res.json({ 
      success: false, 
      message: "Order creation failed. Please try again." 
    });
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
    const limit = 10;
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
        select: "name images description brand category",
      })
      .populate({
        path: "orderedItems.variantId",
        select: "quantityValue quantityType stock regularPrice salePrice",
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

// FIXED: Cancel order items with proper validation
const cancelOrderItems = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.json({ success: false, message: "Please login" });
    }

    const { id } = req.params;
    const { itemIds, reason } = req.body;

    // Validate itemIds
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.json({ success: false, message: "No items selected for cancellation" });
    }

    const order = await Order.findOne({ _id: id, userId })
      .populate("orderedItems.variantId");

    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    const cancellableStatuses = ["Pending", "Confirmed", "Processing"];
    let cancelledCount = 0;
    let alreadyCancelledCount = 0;
    let cannotCancelCount = 0;
    const now = new Date();

    // Process each selected item
    for (const itemIdStr of itemIds) {
      const item = order.orderedItems.id(itemIdStr);
      
      if (!item) continue;

      // Check if already cancelled
      if (item.itemStatus === "Cancelled") {
        alreadyCancelledCount++;
        continue;
      }

      // Check if can be cancelled
      if (!cancellableStatuses.includes(item.itemStatus)) {
        cannotCancelCount++;
        continue;
      }

      // Cancel the item
      item.itemStatus = "Cancelled";
      item.reason = reason || "";
      if (!item.itemTimeline) item.itemTimeline = {};
      item.itemTimeline.cancelledAt = now;

      // Restore stock
      if (item.variantId && item.variantId._id) {
        await Variant.findByIdAndUpdate(
          item.variantId._id,
          { $inc: { stock: item.quantity } }
        );
      }

      cancelledCount++;
    }

    // Update order status based on all items
    const allItemStatuses = order.orderedItems.map(i => i.itemStatus);
    const allCancelled = allItemStatuses.every(s => s === "Cancelled");
    const someCancelled = allItemStatuses.some(s => s === "Cancelled");
    const someActive = allItemStatuses.some(s => cancellableStatuses.includes(s));

    if (allCancelled) {
      order.orderStatus = "Cancelled";
      order.statusTimeline.cancelledAt = now;
    } else if (someCancelled) {
      order.orderStatus = "Partially Cancelled";
    }

    order.markModified("orderedItems");
    order.markModified("statusTimeline");
    await order.save();

    // Build response message
    let message = "";
    if (cancelledCount > 0) {
      message = `${cancelledCount} item(s) cancelled successfully`;
    }
    if (alreadyCancelledCount > 0) {
      message += `. ${alreadyCancelledCount} item(s) already cancelled`;
    }
    if (cannotCancelCount > 0) {
      message += `. ${cannotCancelCount} item(s) cannot be cancelled at this stage`;
    }

    return res.json({
      success: cancelledCount > 0,
      message: message || "No items were cancelled",
    });

  } catch (err) {
    console.error("Cancel Error:", err);
    res.json({ success: false, message: "Something went wrong" });
  }
};

// FIXED: Request return with proper validation
const requestReturn = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.json({ success: false, message: "Please login" });
    }

    const { id } = req.params;
    const { itemId, reason } = req.body;

    // Validate reason (mandatory for returns)
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

    // Find the item
    const item = order.orderedItems.id(itemId);
    if (!item) {
      return res.json({ success: false, message: "Item not found" });
    }

    // Check if item is delivered
    if (item.itemStatus !== "Delivered") {
      return res.json({
        success: false,
        message: "Only delivered items can be returned",
      });
    }

    // Check if already in return process
    if (["ReturnRequested", "ReturnApproved", "Returned"].includes(item.itemStatus)) {
      return res.json({
        success: false,
        message: "Return already requested for this item",
      });
    }

    // Check return window (7 days from item delivery)
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
    const returnStatuses = ["ReturnRequested", "ReturnApproved", "Returned"];
    const someReturning = order.orderedItems.some(i => 
      returnStatuses.includes(i.itemStatus)
    );
    const allDeliveredOrReturning = order.orderedItems.every(i => 
      i.itemStatus === "Delivered" || returnStatuses.includes(i.itemStatus)
    );

    if (someReturning) {
      if (allDeliveredOrReturning) {
        order.orderStatus = "Partially Returned";
      }
    }

    order.markModified("orderedItems");
    await order.save();

    res.json({
      success: true,
      message: "Return request submitted successfully. Admin will review your request",
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

