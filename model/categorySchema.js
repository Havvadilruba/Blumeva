import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  image: {
    type: String,
    required: true,
  },
  isListed: {
    type: Boolean,
    default: true, 
  },
  
}, { timestamps: true }
);
export default mongoose.model("Category", categorySchema);


