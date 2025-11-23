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
    default: ""   
    },
    googleId:{
        type:String,
        unique:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    role: {
      type: String,
      default: "user",
    },
    
}, { timestamps: true }
)

const User=mongoose.model("User",userSchema)
export default User;
