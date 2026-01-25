import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: function (v) {
          if (this.type === "percentage" && v > 90) return false;
          return true;
        },
        message: "Percentage cannot exceed 90%",
      },
    },

    maxDiscount: {
      type: Number,
      min: 0,
      default: 0, 
    },

    minPurchaseAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    usageLimitPerUser: {
      type: Number,
      min: 0,
      default: 1,
    },

    totalUsageLimit: {
      type: Number,
      min: 0,
      default: 0, 
    },

    currentUsageCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    userEligibility: {
      type: String,
      enum: ["all", "new_users", "specific"],
      default: "all",
    },

    specificUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1 });
couponSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.model("Coupon", couponSchema);
