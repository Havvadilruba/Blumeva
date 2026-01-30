import Order from "../model/orderSchema.js";
import User from "../model/userSchema.js";
import Product from "../model/productSchema.js";

export const getDashboardStatsRepo = async () => {
  const revenueAgg = await Order.aggregate([
    { $unwind: "$orderedItems" },

    {
  $match: {
    "orderedItems.itemStatus": "Delivered",
  },
}
,
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $multiply: [
              {
                $max: [
                  {
                    $subtract: [
                      "$orderedItems.salePrice",
                      {
                        $add: [
                          { $ifNull: ["$orderedItems.couponShare", 0] },
                          { $ifNull: ["$orderedItems.discountAmount", 0] },
                        ],
                      },
                    ],
                  },
                  0, 
                ],
              },
              "$orderedItems.quantity",
            ],
          },
        },
      },
    },
  ]);

  return {
    revenue: revenueAgg[0]?.total || 0,

    orders: await Order.countDocuments(),
    users: await User.countDocuments({ isBlocked: false }),
    products: await Product.countDocuments({ isBlocked: false }),
  };
};



export const getSalesChartRepo = async (startDate, groupFormat) => {
  return Order.aggregate([
    {
      $match: {
        deliveredDate: { $gte: startDate },
      },
    },

    { $unwind: "$orderedItems" },

    {
      $match: {
        "orderedItems.itemStatus": {
          $in: ["Delivered", "ReturnRequested", "ReturnRejected"],
        },
      },
    },

    {
      $group: {
        _id: groupFormat,
        revenue: {
          $sum: {
            $multiply: [
              {
                $max: [
                  {
                    $subtract: [
                      "$orderedItems.salePrice",
                      {
                        $add: [
                          { $ifNull: ["$orderedItems.couponShare", 0] },
                          { $ifNull: ["$orderedItems.discountAmount", 0] },
                        ],
                      },
                    ],
                  },
                  0, 
                ],
              },
              "$orderedItems.quantity",
            ],
          },
        },
      },
    },

    { $sort: { _id: 1 } },
  ]);
};



export const getOrderStatusRepo = async () => {
  return Order.aggregate([
    { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
  ]);
};


export const getTopProductsRepo = async () => {
  return Order.aggregate([
    { $unwind: "$orderedItems" },

    {
      $match: {
        "orderedItems.itemStatus": "Delivered",
      },
    },

    {
      $group: {
        _id: "$orderedItems.productId",
        sales: { $sum: "$orderedItems.quantity" },
        revenue: {
          $sum: {
            $multiply: [
              {
                $max: [
                  {
                    $subtract: [
                      "$orderedItems.salePrice",
                      {
                        $add: [
                          { $ifNull: ["$orderedItems.couponShare", 0] },
                          { $ifNull: ["$orderedItems.discountAmount", 0] },
                        ],
                      },
                    ],
                  },
                  0,
                ],
              },
              "$orderedItems.quantity",
            ],
          },
        },
      },
    },

    { $sort: { sales: -1, revenue: -1 } },
    { $limit: 10 },

    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
  ]);
};

export const getTopBrandsRepo = async () => {
  return Order.aggregate([
    { $unwind: "$orderedItems" },

    {
      $match: {
        "orderedItems.itemStatus": "Delivered",
      },
    },

    {
      $lookup: {
        from: "products",
        localField: "orderedItems.productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },

    {
      $group: {
        _id: "$product.brand",
        sales: { $sum: "$orderedItems.quantity" },
        revenue: {
          $sum: {
            $multiply: [
              {
                $max: [
                  {
                    $subtract: [
                      "$orderedItems.salePrice",
                      {
                        $add: [
                          { $ifNull: ["$orderedItems.couponShare", 0] },
                          { $ifNull: ["$orderedItems.discountAmount", 0] },
                        ],
                      },
                    ],
                  },
                  0,
                ],
              },
              "$orderedItems.quantity",
            ],
          },
        },
      },
    },

    { $sort: { sales: -1 } },
    { $limit: 10 },

    {
      $lookup: {
        from: "brands",
        localField: "_id",
        foreignField: "_id",
        as: "brand",
      },
    },
    { $unwind: "$brand" },
  ]);
};


export const getTopCategoryRepo = async () => {
  return Order.aggregate([
    { $unwind: "$orderedItems" },

    {
      $match: {
        "orderedItems.itemStatus": "Delivered",
      },
    },

    {
      $lookup: {
        from: "products",
        localField: "orderedItems.productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },

    {
      $group: {
        _id: "$product.category",
        sales: { $sum: "$orderedItems.quantity" },
        revenue: {
          $sum: {
            $multiply: [
              {
                $max: [
                  {
                    $subtract: [
                      "$orderedItems.salePrice",
                      {
                        $add: [
                          { $ifNull: ["$orderedItems.couponShare", 0] },
                          { $ifNull: ["$orderedItems.discountAmount", 0] },
                        ],
                      },
                    ],
                  },
                  0,
                ],
              },
              "$orderedItems.quantity",
            ],
          },
        },
      },
    },

    { $sort: { sales: -1 } },
    { $limit: 10 },

    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
  ]);
};


export const getRecentOrdersRepo = async () => {
  return Order.find()
    .populate("userId", "name")
    .sort({ createdAt: -1 })
    .limit(5)
    .select("orderId userId finalAmount orderStatus");
};

