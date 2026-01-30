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





export const getSalesReportData = async (pipeline) => {
  return await Order.aggregate(pipeline);
};

export const getOrderTransations = async (basePipeline, skip, limit) => {
  const validSkip = parseInt(skip) || 0;
  const validLimit = parseInt(limit) || 10;
  
  const pipeline = [
    ...basePipeline,
    { $skip: validSkip },
    { $limit: validLimit },
  ];
  
  return await Order.aggregate(pipeline);
};

export const getOrderTransactionsTotal = async (basePipeline) => {
  try {

  const countPipeline = basePipeline.filter(stage => {
 
  if (stage.$skip || stage.$limit || stage.$sort || stage.$project) {
    return false;
  }
  return true;
});

    
   
    const hasUnwind = countPipeline.some(stage => stage.$unwind && 
      (stage.$unwind === '$orderedItems' || stage.$unwind.path === '$orderedItems'));
    
    if (!hasUnwind) {
      countPipeline.push({ $unwind: "$orderedItems" });
    }
    
    countPipeline.push({
      $group: {
        _id: null,
        totalOrders: { $addToSet: "$orderId" },
        grossSales: {
          $sum: {
            $multiply: ["$orderedItems.salePrice", "$orderedItems.quantity"]
          }
        },
       totalDiscounts: {
  $sum: {
    $cond: [
      {
        $or: [
          {
            $and: [
              { $in: ["$paymentMethod", ["razorpay", "wallet"]] },
              {
                $not: {
                  $in: ["$orderedItems.itemStatus", ["Cancelled", "Returned"]]
                }
              }
            ]
          },
          {
            $and: [
              { $eq: ["$paymentMethod", "cod"] },
              { $eq: ["$orderedItems.itemStatus", "Delivered"] }
            ]
          }
        ]
      },
      "$orderedItems.couponShare",
      0
    ]
  }
}
,
      netSales: {
  $sum: {
    $cond: [
      {
        $or: [
          
          {
            $and: [
              { $in: ["$paymentMethod", ["razorpay", "wallet"]] },
              {
                $not: {
                  $in: ["$orderedItems.itemStatus", ["Cancelled", "Returned"]]
                }
              }
            ]
          },

        
          {
            $and: [
              { $eq: ["$paymentMethod", "cod"] },
              { $eq: ["$orderedItems.itemStatus", "Delivered"] }
            ]
          }
        ]
      },
      {
        $subtract: [
          { $multiply: ["$orderedItems.salePrice", "$orderedItems.quantity"] },
          {
            $add: [
              { $multiply: ["$orderedItems.discountAmount", "$orderedItems.quantity"] },
              "$orderedItems.couponShare"
            ]
          }
        ]
      },
      0
    ]
  }
}
,
       productsSold: {
  $sum: {
    $cond: [
      {
        $or: [
          {
            $and: [
              { $in: ["$paymentMethod", ["razorpay", "wallet"]] },
              {
                $not: {
                  $in: ["$orderedItems.itemStatus", ["Cancelled", "Returned"]]
                }
              }
            ]
          },
          {
            $and: [
              { $eq: ["$paymentMethod", "cod"] },
              { $eq: ["$orderedItems.itemStatus", "Delivered"] }
            ]
          }
        ]
      },
      "$orderedItems.quantity",
      0
    ]
  }
}


      }
    });
    
    countPipeline.push({
      $project: {
        _id: 0,
        totalOrders: { $size: "$totalOrders" },
        grossSales: { $round: ["$grossSales", 2] },
        netSales: { $round: ["$netSales", 2] },
        totalDiscounts: { $round: ["$totalDiscounts", 2] },
        productsSold: 1
      }
    });
    
    const result = await Order.aggregate(countPipeline);
    return result[0] || {
      totalOrders: 0,
      grossSales: 0,
      netSales: 0,
      totalDiscounts: 0,
      productsSold: 0
    };
  } catch (error) {
    console.error("Error calculating order transactions total:", error);
    throw error;
  }
};

export const getStatusCounts = async (dateFilter) => {
  const pipeline = [
    { $match: dateFilter },
    { $unwind: "$orderedItems" },
    {
      $group: {
        _id: "$orderedItems.itemStatus",
        count: { $sum: 1 }
      }
    }
  ];
  
  const result = await Order.aggregate(pipeline);
  

  const allStatuses = [
    "Pending", "Confirmed", "Processing", "Shipped", "Delivered",
    "Cancelled", "Returned", "ReturnApproved", "ReturnRequested",
    "ReturnRejected", "Out for Delivery"
  ];
  
  const statusCounts = {};
  

  allStatuses.forEach(status => {
    statusCounts[status] = 0;
  });
  
  result.forEach(item => {
    if (item._id) {
      statusCounts[item._id] = item.count;
    }
  });
  
  return statusCounts;
};