import Order from "../model/orderSchema.js";
import User from "../model/userSchema.js";
import Variant from "../model/variantSchema.js";

// ----------------------------------------------
// Create Order
// ----------------------------------------------
export const createOrder = (orderData) => {
  return Order.create(orderData);
};

// ----------------------------------------------
// Find Order by orderId (Human readable)
// ----------------------------------------------
export const findOrderByOrderId = (orderId) => {
  return Order.findOne({ orderId })
    .populate("orderedItems.productId")
    .populate("orderedItems.variantId");
};

// ----------------------------------------------
// Find User Orders (All orders of a user)
// ----------------------------------------------
export const findUserOrders = (query) => {
  return Order.find(query)
    .sort({ createdAt: -1 })
    .populate("orderedItems.productId")
    .populate("orderedItems.variantId");
};

// ----------------------------------------------
// Find Order by MongoDB _id
// ----------------------------------------------
export const findOrderById = (id) => {
  return Order.findById(id)
    .populate({
      path: "userId",
      select: "name email"
    })
    .populate({
      path: "orderedItems.productId",
      select: "name images"
    })
    .populate({
      path: "orderedItems.variantId",
      select: "quantityValue quantityType"
    });
};

// ----------------------------------------------
// Save Order (after updates)
// ----------------------------------------------
export const saveOrder = (order) => {
  return order.save();
};

// ----------------------------------------------
// Find Order (with product details)
// ----------------------------------------------
export const findOrderByIdWithItems = (orderId) => {
  return Order.findById(orderId)
    .populate("orderedItems.productId")
    .populate("orderedItems.variantId");
};

// ----------------------------------------------
// Find Order with User
// ----------------------------------------------
export const findOrderByOrderIdWithUser = (orderId) => {
  return Order.findOne({ orderId })
    .populate("orderedItems.productId")
    .populate("orderedItems.variantId")
    .populate("userId");
};

// ----------------------------------------------
// Find Orders (Admin listing with sort)
// ----------------------------------------------
export const findOrders = (query, skip, limit) => {
  return Order.find(query)
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// ----------------------------------------------
// Count Orders
// ----------------------------------------------
export const countOrders = (query) => {
  return Order.countDocuments(query);
};

// ----------------------------------------------
// Search Users for Order Filtering
// ----------------------------------------------
export const searchUsers = async (search) => {
  return User.find({
    $or: [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ],
  }).select("_id");
};

// ----------------------------------------------
// Variant Stock Restore (for cancel/return)
// ----------------------------------------------
export const restoreVariantStock = (variantId, qty) => {
  return Variant.findByIdAndUpdate(
    variantId,
    { $inc: { stock: qty } },
    { new: true }
  );
};

export const findRawOrderById = (id) => {
  return Order.findById(id);
};

export const updateOrder = (order) => {
  return order.save();
};

export const getOrderTransations = (pipeline,skip,limit) => {
  return Order.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]);
};

export const getOrderTransationsTotal=(pipeline)=>{
  return Order.aggregate([
    ...pipeline,
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$totalAmount" }, // NET SALES
        totalOrders: { $sum: 1 },
        totalDiscounts: { $sum: "$discount" },
        productsSold: { $sum: "$itemCount" },
      },
    },
  ]);
}
