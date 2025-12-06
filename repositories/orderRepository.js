import Order from "../model/orderSchema.js";
import User from "../model/userSchema.js";
import Variant from "../model/variantSchema.js";

export const findOrders = async (query, skip, limit) => {
  return Order.find(query)
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

export const countOrders = async (query) => {
  return Order.countDocuments(query);
};

export const searchUsers = async (search) => {
  return User.find({
    $or: [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ]
  }).select("_id");
};

export const findOrderById = async (id) => {
  return Order.findById(id)
    .populate("userId", "name email phone")
    .populate({ path: "orderedItems.productId", model: "Product" })
    .populate({ path: "orderedItems.variantId", model: "Variant" })
    .lean();
};

export const findRawOrderById = async (id) => {
  return Order.findById(id);
};

export const updateOrder = async (order) => {
  return order.save();
};

export const restoreVariantStock = async (variantId, qty) => {
  return Variant.findByIdAndUpdate(
    variantId,
    { $inc: { stock: qty } },
    { new: true }
  );
};
