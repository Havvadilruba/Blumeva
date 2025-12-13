import mongoose from "mongoose";

const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referred: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referrerAmount: { type: Number, required: true, default: 100 },
    referredAmount: { type: Number, required: true, default: 50 },
    codeUsed: { type: String, required: true },
    status: {
      type: String,
      enum: ["APPLIED", "COMPLETED"],
      default: "COMPLETED",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Referral", referralSchema);

