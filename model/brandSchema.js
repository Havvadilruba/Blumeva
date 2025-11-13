import mongoose from "mongoose";

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  logo: {
    type: String, 
    required: true
  },
  productCount: {
    type: Number,
    default: 0
  },
  status: {
    type: Boolean,
    default: true 
  }
}, { timestamps: true });

export default mongoose.model("Brand", brandSchema);

