import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({

  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
      type: String,
      default: "admin",
    },
    profileImage: {
    type: String,
    default:
      "https://res.cloudinary.com/dtazbbayi/image/upload/v1766385959/user-profile-icon-avatar-person-sign-profile-picture-portrait-symbol-easily-editable-line_fpdimj.jpg"
  }
});

export default mongoose.model("Admin", adminSchema);

