import Order from "../model/orderSchema.js";
import User from "../model/userSchema.js";
import Variant from "../model/variantSchema.js";


export const createOrder = (orderData) => {
  return Order.create(orderData);
};


export const findOrderByOrderId = (orderId) => {
  return Order.findOne({ orderId })
    .populate("orderedItems.productId")
    .populate("orderedItems.variantId");
};


export const findUserOrders = (query) => {
  return Order.find(query)
    .sort({ createdAt: -1 })
    .populate("orderedItems.productId")
    .populate("orderedItems.variantId");
};


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


export const saveOrder = (order) => {
  return order.save();
};


export const findOrderByIdWithItems = (orderId) => {
  return Order.findById(orderId)
    .populate("orderedItems.productId")
    .populate("orderedItems.variantId");
};


export const findOrderByOrderIdWithUser = (orderId) => {
  return Order.findOne({ orderId })
    .populate("orderedItems.productId")
    .populate("orderedItems.variantId")
    .populate("userId");
};


export const findOrders = (query, skip, limit) => {
  return Order.find(query)
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};


export const countOrders = (query) => {
  return Order.countDocuments(query);
};


export const searchUsers = async (search) => {
  return User.find({
    $or: [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ],
  }).select("_id");
};

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




      
    