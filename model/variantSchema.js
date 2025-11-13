import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantityValue: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
    quantityType: {
      type: String,
      required: true,
      enum: ["ml", "g"], 
    },
    regularPrice: {
      type: Number,
      required: true,
      min: [0, "Regular price cannot be negative"],
    },
    salePrice: {
      type: Number,
      required: true,
      min: [0, "Sale price cannot be negative"],
      validate: {
        validator: function (v) {
          return v <= this.regularPrice;
        },
        message: "Sale price should not exceed regular price",
      },
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Variant", variantSchema);


