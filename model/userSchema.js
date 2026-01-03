import mongoose from "mongoose";
const { Schema } = mongoose;


const userSchema=new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:false
    },
    profileImage: {
    type: String,
     default: "https://res.cloudinary.com/dtazbbayi/image/upload/v1766385959/user-profile-icon-avatar-person-sign-profile-picture-portrait-symbol-easily-editable-line_fpdimj.jpg"   
    },
    googleId: {
  type: String,
  default: null,
  unique: true,
  sparse: true
},

    isBlocked:{
        type:Boolean,
        default:false
    },
    role: {
      type: String,
      default: "user",
    },
referralCode: {
  type: String,
  unique: true,
  sparse: true,
  index: true,
},

referredBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
},

referralRewards: {
  type: Number,
  default: 0,
  min: 0
},

    
}, { timestamps: true }
)

const User=mongoose.model("User",userSchema)
export default User;
