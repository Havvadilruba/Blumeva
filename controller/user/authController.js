
const User=require("../../model/userSchema")
const nodemailer=require("nodemailer")
const env=require("dotenv").config()
const bcrypt =require("bcrypt")

// load Sign Up
const loadSignup=async(req,res)=>{
    try{
        return res.render("signup",{message:null})
    }catch(error){
        console.log("homepage not found",error)
        res.status(500).send("Server Error")
    }
}

function generateOtp(){
    return Math.floor(100000 +  Math.random()*900000).toString()
}

async function sendVerificationEmail(email,otp){
    try{

        const transporter=nodemailer.createTransport({
            service:"gmail",
            port:587,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info=await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is ${otp}`,
            html:`<b>Your OTP : ${otp}</b>`
        })

        return info.accepted.length>0
    }catch(error){
        console.log("Error sending email",error)
        return false
    }
}

//sing Up
const signup=async(req,res)=>{
    try{

        const {name,email,password,cpassword}=req.body
        if(password !==cpassword){
            return res.render("signup",{message:"Password do not match"})
        }

        const findUser=await User.findOne({email})
        if(findUser){
            return res.render("signup",{message:"User with this email already exists"})
        }

        const otp=generateOtp();

        const emailSent=await sendVerificationEmail(email,otp)
            if(!emailSent){
                return res.json("email.error")
            }
        req.session.userOtp=otp
        req.session.userData={name,email,password}

        res.render("verifyOtp")
        console.log("Otp Sent",otp)

    }catch(error){
        console.log("Signup error",error)
        res.redirect("/pageNotFound")
    }
}

const securePassword=async (password)=>{
    try{
        const passwordHash =await bcrypt.hash(password,10)
        return passwordHash
    }catch(error){

    }
}

const verifyOtp=async (req,res)=>{
    try{

        const {otp}=req.body
        console.log(otp)

        if(otp===req.session.userOtp){
            const user=req.session.userData
            const passwordHash=await securePassword(user.password)
        

        const saveUserData = new User({
            name:user.name,
            email:user.email,
            phone:user.phone,
            password:passwordHash
        })

        await saveUserData.save()
        req.session.user=saveUserData._id;
        res.json({success:true,redirectUrl:"/"})
        }else{
            res.status(400).json({success:false,message:"Invalid OTP,Please try again"})
        }
    }catch(error){
        
        console.log("Error verifying OTP",error)
        res.status(500).json({success:false,message:"An error occured"})
    }
}

const resendOtp =async(req,res)=>{
    try{

        const {email}=req.session.userData
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
       
        }
        const otp=generateOtp()
            req.session.userOtp=otp

            const emailSent=await sendVerificationEmail(email,otp)
        
            if(emailSent){
                console.log("Resend OTP:",otp)
                res.status(200).json({success:true,message:"OTP Resend Succesfully"})
            }else{
                res.status(500).json({success:false,message:"Failed to resend OTP. Please try again"})
            }
        
    }catch(error){
        console.log("Error resending OTP",error)
        res.status(500).json({success:false,message:"Internal Server Error. Please try again"})
    }
}

const loadLogin =async (req,res)=>{

    try{
        if(!req.session.user){
            return res.render("login" ,{ message: null })
        }else{
            res.redirect("/")
        }
    }catch(error){
        res.redirect("/pageNotFound")
    }

}

const login =async (req,res)=>{
    try{

        const {email,password}=req.body

        const findUser=await User.findOne({isAdmin:0,email:email})

        if(!findUser){
            return res.render("login",{message:"User not found"})
        }
        if(findUser.isBlocked){
            return res.render("login",{message:"User is blocked by admin"})
        } 
        const passwordMatch=await bcrypt.compare(password,findUser.password)
    
        if(!passwordMatch){
            return res.render("login",{message:"Incorrect Password"})
        }
    req.session.user=findUser._id
    res.redirect("/")
    }catch(error){
        console.log("login error",error)
        res.render("login",{message:"Login faled"})
    }
}



module.exports = { loadSignup,signup,verifyOtp,resendOtp,loadLogin,login};