import User from "../../model/userSchema.js";
import bcrypt from "bcrypt";
import { generateOtp } from "../../helpers/otpHelper.js";
import { sendVerificationEmail } from "../../helpers/emailHelper.js";
import { signupValidation, otpValidation, loginValidation } from "../../validations/userauthValidation.js";
import { processReferral } from "../../services/referralService.js";

import Joi from "joi";


const loadSignup=async(req,res)=>{
  try{
    if (req.session.user) {
      return res.redirect("/");
    }
    return res.render("user/signup",{message:null,layout:false});
  }catch(error){
    console.log(error);
    res.status(500).send("Server Error");
  }
}

//sing Up
const signup = async (req, res) => {
  try {
    const { name, email, password, cpassword ,referralCode} = req.body;

    const { error } = signupValidation.validate({ name, email, password, cpassword });
    if (error)
      return res.status(400).json({ 
    success: false, 
    message: error.details[0].message });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent)
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email",
      });


    req.session.userOtp = otp;
    req.session.userOtpTime = Date.now();
    req.session.userData = { name, email, password,referralCode };

    console.log("OTP :", otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      redirectUrl: "/verifyOtp",
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const loadVerifyOtp = async (req, res) => {
  try {
    if (!req.session.userData || !req.session.userOtp) {
      return res.redirect("/signup"); 
    }

    const { email } = req.session.userData;
    res.render("user/verifyOtp", { 
      email, 
      layout: false, 
      isReset: false });
  } catch (error) {
    console.error("Error loading verifyOtp:", error);
    res.status(500).send("Server Error");
  }
};


const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    const { error } = otpValidation.validate({ otp });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    if (otp !== req.session.userOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    const userSession = req.session.userData;
    const hashedPassword = await bcrypt.hash(userSession.password, 10);

    /** Generate a unique referral code */
    async function generateUniqueReferralCode() {
      const prefix = "BLM";
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

      for (let attempt = 0; attempt < 6; attempt++) {
        let code = prefix;
        for (let i = 0; i < 6; i++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }

        const exists = await User.findOne({ referralCode: code });
        if (!exists) return code;
      }

      return prefix + Date.now().toString(36).toUpperCase();
    }

    /** Create new user */
    const newUser = new User({
      name: userSession.name,
      email: userSession.email.toLowerCase(),
      password: hashedPassword,
      isVerified: true,
      referralCode: await generateUniqueReferralCode(),
      referredBy: null,
    });

    /** Check if user entered a valid referral code */
    let referredByUser = null;

    if (userSession.referralCode) {
      referredByUser = await User.findOne({
        referralCode: userSession.referralCode,
      });

      if (referredByUser) {
        newUser.referredBy = referredByUser._id;
      }
    }

    await newUser.save();

    /** Process referral rewards */
    if (referredByUser) {
      try {
        await processReferral(referredByUser._id, newUser._id, userSession.referralCode );
      } catch (err) {
        console.error("Referral processing failed:", err);
      }
    }

    /** Cleanup session */
    delete req.session.userOtp;
    delete req.session.userData;

    return res.json({ success: true, redirectUrl: "/login" });

  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData || {};
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email not found" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;
    req.session.userOtpTime = Date.now()
    console.log(otp)
    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to resend OTP" });
    }
    
    res.status(200).json({ 
      success: true, 
      message: "OTP resent successfully" });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error." });
  }
};
const loadLogin =async (req,res)=>{

    try{
        if(!req.session.user){
            return res.render("user/login" ,{ message: null,layout:false})
        }else{
            return res.redirect("/")
        }
    }catch(error){
        res.redirect("/pageNotFound")
    }

}


const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { error } = loginValidation.validate({ email, password });
    if (error)
      return res.status(400).json({ 
    success: false, 
    message: error.details[0].message });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ 
    success: false, 
    message: "No account " });

    if (user.isBlocked)
      return res.status(403).json({
        success: false,
        message: "Your account  blocked by admin",
      });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ 
    success: false,
     message: "Incorrect password" });

    req.session.user = { _id: user._id };

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      redirectUrl: "/",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const googleLogin = (req, res) => {
  try {
    if (req.user) {
      req.session.user = { _id: req.user._id };
      return res.redirect("/");
    }
    return res.redirect("/signup");
  } catch (error) {
    console.error("Google Login Error:", error);
    return res.redirect("/signup");
  }
};


const loadForgotPassword = (req, res) => {
  res.render("user/forgotPassword", {
     layout: false, 
     message: null });
};


const sendResetOtp = async (req, res) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required().messages({
        "string.email": "Enter a valid email",
        "string.empty": "Email is required",
      }),
    });

    const { error } = schema.validate(req.body);
    if (error)
      return res.status(400).json({ 
    success: false, 
    message: error.details[0].message });

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({
     success: false, 
     message: "No user found with this email" });

     if (user.googleId) {
  return res.status(403).json({
    success: false,
    isGoogleUser: true,
    message: "This account was created using Google. Please login with Google.",
  });
}

    const otp = generateOtp();
    const sent = await sendVerificationEmail(email, otp);
    if (!sent)
      return res.status(500).json({ 
    success: false,
     message: "Failed to send OTP" });

    req.session.resetOtp = otp;
    req.session.resetEmail = email;
    req.session.resetOtpExpiry = Date.now() + 5 * 60 * 1000;

    console.log("RESET OTP:", otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      redirectUrl: "/verify-reset",
    });
  } catch (error) {
    console.error("Send Reset OTP Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" });
  }
};


const loadVerifyReset = (req, res) => {
  if (!req.session.resetEmail) return res.redirect("/forgot-password");
  res.render("user/verifyOtp", { 
    layout: false, 
    email: req.session.resetEmail, 
    isReset: true }); 
};


const verifyResetOtp = (req, res) => {
  try {
    const { otp } = req.body;

    if (!req.session.resetOtp)
      return res.status(400).json({ 
    success: false,
     message: "OTP not found"
     });

    if (Date.now() > req.session.resetOtpExpiry)
      return res.status(400).json({
     success: false,
      message: "OTP expired" 
    });


    if (otp.trim() !== String(req.session.resetOtp))
      return res.status(400).json({ 
    success: false, 
    message: "Invalid OTP" });

    req.session.allowReset = true;

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      redirectUrl: "/reset-password",
    });
  } catch (error) {
    console.error("Verify Reset OTP Error:", error);
    res.status(500).json({
       success: false,
        message: "Server error" });
  }
};


const loadResetPassword = (req, res) => {
  if (!req.session.allowReset) return res.redirect("/forgot-password");
  res.render("user/resetPassword", { layout: false });
};
const saveNewPassword = async (req, res) => {
  try {
    const schema = Joi.object({
      password: Joi.string().min(6).required().messages({
        "string.empty": "Password is required",
        "string.min": "Password must be at least 6 characters",
      }),
      confirmPassword: Joi.string()
        .valid(Joi.ref("password"))
        .required()
        .messages({
          "any.only": "Passwords do not match",
          "string.empty": "Confirm password is required",
        }),
    });

    const { error } = schema.validate(req.body);
    if (error)
      return res.status(400).json({ 
    success: false,
     message: error.details[0].message });

    const { password } = req.body;
    const email = req.session.resetEmail;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({
     success: false,
      message: "User not found" });

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    await user.save();

    req.session.resetEmail = null;
    req.session.resetOtp = null;
    req.session.allowReset = null;

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
      redirectUrl: "/login",
    });
  } catch (error) {
    console.error("Save New Password Error:", error);
    res.status(500).json({ 
      success: false,
       message: "Server error" });
  }
};

const logout = (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout Error:", err);
      }
      res.clearCookie("userSession");
      res.redirect("/login");
    });
  } catch (error) {
    console.error("Logout Error:", error);
    res.redirect("/");
  }
};





export default { 
  loadSignup,
  loadForgotPassword,
  sendResetOtp,
  loadVerifyReset,
  verifyResetOtp,
  loadResetPassword,
  saveNewPassword,
  signup,
  loadVerifyOtp,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  logout,
  googleLogin
};
