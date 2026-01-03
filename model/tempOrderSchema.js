import mongoose from "mongoose";

const tempOrderItemSchema = new mongoose.Schema({
  productId: mongoose.Schema.Types.ObjectId,
  variantId: mongoose.Schema.Types.ObjectId,
  quantity: Number,

  regularPrice: Number,
  salePrice: Number,
  discountAmount: { type: Number, default: 0 },
  couponShare: { type: Number, default: 0 },
});

const tempOrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    addressId: { type: mongoose.Schema.Types.ObjectId, ref: "address", required: true },

    orderedItems: [tempOrderItemSchema],

    shippingAddress: { type: Object, required: true },

    subtotal: Number,
    discount: Number,
    deliveryCharge: Number,

    couponDiscount: Number,
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", default: null },

    finalAmount: Number,

    paymentMethod: {
      type: String,
      enum: ["razorpay"],
      default: "razorpay",
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Success", "Failed"],
      default: "Pending",
    },

    razorpayOrderId: String,
razorpayPaymentId: String,
razorpaySignature: String,
finalOrderId: String,
razorpayStatus: {
  type: String,
  enum: ["INITIATED", "PAID", "FAILED"],
  default: "INITIATED"
}

  },
  { timestamps: true }
);

export default mongoose.model("TempOrder", tempOrderSchema);
