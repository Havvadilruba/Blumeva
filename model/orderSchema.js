import mongoose from "mongoose";
import crypto from "crypto";

// -----------------------------------------------------
// Ordered Item Schema
// -----------------------------------------------------
const orderedItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Variant",
    required: true,
  },

  quantity: { type: Number, required: true, min: 1 },

  regularPrice: { type: Number, required: true },
  salePrice: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  couponShare: { type: Number, default: 0 },

  itemStatus: {
    type: String,
    enum: [
      "Pending",
      "Confirmed",
      "Processing",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
      "ReturnRequested",
      "ReturnRejected",
      "ReturnApproved",
      "Returned",
    ],
    default: "Pending",
  },

  itemTimeline: {
    confirmedAt: Date,
    processedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    returnRequestedAt: Date,
    returnRejectedAt: Date,
    returnApprovedAt: Date,
    returnedAt: Date,
  },

  isReviewed: {
    type: Boolean,
    default: false,
  },

  reason: String,
  adminNote: String,
});

// -----------------------------------------------------
// Shipping Address Snapshot
// -----------------------------------------------------
const shippingAddressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  address1: { type: String, required: true },
  address2: String,
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  country: { type: String, required: true },
  addressType: String,
});

// -----------------------------------------------------
// MAIN ORDER SCHEMA
// -----------------------------------------------------
const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, index: true },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "address",
      required: true,
    },

    orderStatus: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Processing",
        "Shipped",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
        "Returned",
        "Partially Delivered",
        "Partially Cancelled",
        "Partially Returned",
      ],
      default: "Pending",
    },

    statusTimeline: {
      confirmedAt: Date,
      processedAt: Date,
      shippedAt: Date,
      outForDeliveryAt: Date,
      deliveredAt: Date,
      cancelledAt: Date,
      returnedAt: Date,
    },

    orderedItems: [orderedItemSchema],

    shippingAddress: shippingAddressSchema,

    paymentMethod: {
      type: String,
      enum: ["razorpay", "cod", "wallet"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },

    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },

    paymentInfo: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
      walletTransactionId: String,
    },

    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    couponDiscount: { type: Number, default: 0 },

    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },

    deliveryCharge: { type: Number, default: 0 },

    finalAmount: { type: Number, required: true },

    expectedDelivery: Date,
    deliveredDate: Date,
  },
  { timestamps: true }
);

orderSchema.pre("save", function (next) {
  if (!this.orderId) {
    const random = crypto.randomBytes(3).toString("hex").toUpperCase();
    const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
    this.orderId = `ORD-${date}-${random}`;
  }
  next();
});

export default mongoose.model("Order", orderSchema);


