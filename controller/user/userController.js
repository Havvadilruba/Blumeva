
const User=require("../../model/userSchema")
const nodemailer=require("nodemailer")
const env=require("dotenv").config()

// load Sign Up
const loadSignup=async(req,res)=>{
    try{
        return res.render("signup")
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
            subject:"Verify your accoun",
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
            if(!email){
                return res.json("email.error")
            }
        req.session.userOTP=otp
        req.session.userData={name,email,password}

        res.render("verifyOtp")
        console.log("Otp Sent",otp)

    }catch(error){
        console.log("Signup error",error)
        res.redirect("/pageNotFound")
    }
}

//Page not found
const pageNotFound=async(req,res)=>{
    try{
        res.render("page-404")
    }catch (error){
       res.redirect("/pageNotFound") 
    }
}




//Home page
const loadHomepage=async (req,res)=>{
    try{
        return res.render("home")
    }
    catch(error){
        console.log("Home page not found")
        res.status(500).send("server error")
    }
}
module.exports = { loadHomepage,pageNotFound ,loadSignup,signup};