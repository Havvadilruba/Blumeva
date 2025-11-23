import User from "../../model/userSchema.js";
import { profileValidation } from "../../validations/profileValidation.js";
import cloudinary from "../../config/cloudinary.js";
import { sendVerificationEmail } from "../../helpers/emailHelper.js";
import { generateOtp } from "../../helpers/otpHelper.js";
import Joi from "joi";
import changePassValidation from "../../validations/changePassValidation.js";
import bcrypt from "bcrypt";

const loadProfile = async (req, res) => {
  try {
    return res.render("user/profile", {
      activePage: "personal-info",
      layout: "layouts/user",
      title: "Profile | Blumeva",
      pageCSS: "/style/user/profile.css"
    });

  } catch (error) {
    console.log("Load profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load profile page"
    });
  }
};


const loadEditProfile = async (req, res) => {
  try {
    return res.render("user/profileEdit", {
      activePage: "personal-info",
      layout: "layouts/user",
      title: "Profile Edit | Blumeva",
      pageCSS: "/style/user/profileEdit.css"
    });

  } catch (error) {
    console.log("Load Edit Profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load edit profile page"
    });
  }
};


// const updateProfile = async (req, res) => {
//   try {
//     const { error } = profileValidation.validate(req.body, { abortEarly: true });
//     if (error) {
//       return res.status(400).json({
//         success: false,
//         message: error.details[0].message,
//       });
//     }

//     const { name, removePhoto } = req.body;
//     const user = await User.findById(req.session.user.id);

//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     if (removePhoto === "true" && !req.file) {
//       user.profileImage = "";
//     }
//     if (req.file) {
//       user.profileImage = req.file.path;
//     }

//     user.name = name;
//     await user.save();
    
    
//     return res.status(200).json({
//       success: true,
//       message: "Profile updated successfully"
//     });

//   } catch (error) {
//     console.log("Profile update error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };

const updateProfile = async (req, res) => {
  try {

    console.log("---- UPDATE PROFILE START ----");
    console.log("Session user:", req.session.user);
    console.log("Body:", req.body);
    console.log("File:", req.file);

    const { error } = profileValidation.validate(req.body, { abortEarly: true });
    if (error) {
      console.log("Validation Error:", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { name, removePhoto } = req.body;

    const user = await User.findById(req.session.user.id);
    console.log("Fetched User:", user);

    if (!user) {
      console.log("User not found with id:", req.session.user.id);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (removePhoto === "true" && !req.file) {
      console.log("Removing profile photo");
      user.profileImage = "";
    }

    if (req.file) {
      console.log("New file received:", req.file.path);
      user.profileImage = req.file.path;
    }

    console.log("Updating name to:", name);
    user.name = name;

    await user.save();
    console.log("User saved successfully");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully"
    });

  } catch (error) {
    console.log("Profile update error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

const loadEditEmail = async (req, res) => {
  try {
    return res.render("user/emailEdit", {
      activePage: "personal-info",
      layout: "layouts/user",
      title: "Email Edit | Blumeva",
      pageCSS: "/style/user/emailEdit.css"
    });

  } catch (error) {
    console.log("Load edit email error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load email edit page"
    });
  }
};

const editEmail = async (req, res) => {
  try {
    const emailSchema = Joi.object({
      newEmail: Joi.string()
        .email()
        .required()
        .messages({
          "string.email": "Please enter a valid email",
          "string.empty": "New email is required",
        }),
    });

    const { error } = emailSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const newEmail = req.body.newEmail;

    // Get existing user email from DB
    const user = await User.findById(req.session.user.id).select("email");
    const oldEmail = user.email;

    // Same email check
    if (newEmail === oldEmail) {
      return res.status(400).json({
        success: false,
        message: "New email must be different from current email",
      });
    }

    // Already existing email check
    const existUser = await User.findOne({ email: newEmail });
    if (existUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Generate and send OTP
    const otp = generateOtp();
    console.log("OTP:", otp);

    const emailSent = await sendVerificationEmail(newEmail, otp);
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong. Please try again.",
      });
    }

    req.session.emailOTP = otp;
    req.session.newEmail = newEmail;

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your new email",
    });

  } catch (err) {
    console.log("Edit email error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

const loadEmailVerify = async (req, res) => {
  try {
    return res.render("user/emailVerify", {
      layout: "layouts/user",
      title: "Verify Email OTP | Blumeva",
      activePage: "personal-info", 
      pageCSS: "/style/user/emailEdit.css",
       email: req.session.newEmail,
    });
  } catch (error) {
    console.log("Load email verify error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load OTP page",
    });
  }
};
const verifyEmailOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp || otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (otp !== req.session.emailOTP) {
      return res.status(400).json({
        success: false,
        message: "Incorrect OTP",
      });
    }

    // Update email
    await User.findByIdAndUpdate(req.session.user.id, {
      email: req.session.newEmail
    });

    // Clear temp session
    delete req.session.emailOTP;
    delete req.session.newEmail;

    return res.status(200).json({
      success: true,
      message: "Email updated successfully",
    });

  } catch (error) {
    console.log("Verify email OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

const resendEmailOtp = async (req, res) => {
  try {
    const newEmail = req.session.newEmail;

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        message: "New email not found in session",
      });
    }

    const otp = generateOtp();
    console.log("RESEND OTP:", otp);  // debug only

    const emailSent = await sendVerificationEmail(newEmail, otp);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to resend OTP",
      });
    }

    req.session.emailOTP = otp;  // UPDATE stored OTP

    return res.status(200).json({
      success: true,
      message: "New OTP sent successfully!",
    });

  } catch (error) {
    console.log("Resend email OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while resending OTP",
    });
  }
};

const loadChangePassword = async (req, res) => {
  try {
    return res.render("user/changePassword", {
      layout: "layouts/user",
      title: "Change Password | Blumeva",
      activePage: "personal-info",
      pageCSS: "/style/user/changePassword.css",
    });

  } catch (error) {
    console.log("Load Change Password error:", error);
    return res.status(500).render("error", {
      message: "Unable to load change password page",
      title: "Error | Blumeva",
    });
  }
};

 const updatePassword = async (req, res) => {
  try {
    // Joi validation
    const { error } = changePassValidation.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.session.user.id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user || !user.password) {
      return res.status(404).json({
        success: false,
        message: "User not found or password not applicable",
      });
    }

    // Compare old password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });

  } catch (error) {
    console.log("Update password error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export default{ 
  loadProfile,
  loadEditProfile,
  updateProfile,
  loadEditEmail,
  editEmail,
  loadEmailVerify,
  verifyEmailOtp,
  resendEmailOtp,
  updatePassword,
  loadChangePassword 
};

