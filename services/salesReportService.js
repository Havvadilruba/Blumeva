import {
  getOrderTransations,
  getOrderTransationsTotal,
} from "../repositories/orderRepository.js";

export const getDeliveredSalesReportService = async ({
  reportType,
  startDate,
  endDate,
  page,
  limit,
}) => {
  
  // ---------------- DATE FILTER ----------------
  let dateFilter = {};
  const today = new Date();
  
  if (reportType === "daily") {
    today.setHours(0, 0, 0, 0);
    dateFilter = { createdAt: { $gte: today } };
  }

  if (reportType === "weekly") {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    dateFilter = { createdAt: { $gte: weekAgo } };
  }

  if (reportType === "monthly") {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    monthAgo.setHours(0, 0, 0, 0);
    dateFilter = { createdAt: { $gte: monthAgo } };
  }

  if (reportType === "yearly") {
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    yearAgo.setHours(0, 0, 0, 0);
    dateFilter = { createdAt: { $gte: yearAgo } };
  }

  if (reportType === "custom" && startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    dateFilter = {
      createdAt: {
        $gte: start,
        $lte: end,
      },
    };
  }

  const skip = (page - 1) * limit;

  // ---------------- AGGREGATION ----------------
  const basePipeline = [
    { $match: dateFilter },

    // Join user
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },

    // Flatten items
    { $unwind: "$orderedItems" },

    // 🔥 ONLY DELIVERED ITEMS
    {
      $match: {
        "orderedItems.itemStatus": {
          $in: ["Delivered", "ReturnRejected"],
        },
      },
    },

    // ---------------- CALCULATIONS PER ITEM ----------------
   // ---------------- CALCULATIONS PER ITEM (FIXED) ----------------
{
  $addFields: {
    // What customer ACTUALLY paid per unit
    finalUnitPrice: {
      $subtract: [
        "$orderedItems.salePrice",
        {
          $add: [
            "$orderedItems.discountAmount",
            "$orderedItems.couponShare"
          ]
        }
      ]
    }
  }
},
{
  $addFields: {
   
    itemNetTotal: {
      $multiply: [
        "$finalUnitPrice",
        "$orderedItems.quantity"
      ]
    },

    // Total discount per item (offer + coupon ONLY)
    itemDiscountTotal: {
      $multiply: [
        {
          $add: [
            "$orderedItems.discountAmount",
            "$orderedItems.couponShare"
          ]
        },
        "$orderedItems.quantity"
      ]
    }
  }
},

    // ---------------- GROUP BY ORDER ----------------
    {
      $group: {
        _id: "$_id",
        orderId: { $first: "$orderId" },
        createdAt: { $first: "$createdAt" },
        customerName: { $first: "$user.username" },
        customerEmail: { $first: "$user.email" },
        paymentMethod: { $first: "$paymentMethod" },

        itemCount: { $sum: "$orderedItems.quantity" },
        totalAmount: { $sum: "$itemNetTotal" },
        discount: { $sum: "$itemDiscountTotal" }, 
      },
    },

    { $sort: { createdAt: -1 } },
  ];

  const transactions = await getOrderTransations(basePipeline, skip, limit);

  const totalsAgg = await getOrderTransationsTotal(basePipeline);

  const totals = totalsAgg[0] || {};

  const totalTransactions = totals.totalOrders || 0;
  const totalPages = Math.ceil(totalTransactions / limit);

  return {
    salesData: {
      transactions,
      totalSales: totals.totalSales || 0,
      totalOrders: totals.totalOrders || 0,
      totalDiscounts: totals.totalDiscounts || 0,
      productsSold: totals.productsSold || 0,
      averageOrderValue:
      totals.totalOrders > 0 ? totals.totalSales / totals.totalOrders : 0,
    },
    totalTransactions,
    totalPages,
    currentPage: page,
    limit,
  };
};