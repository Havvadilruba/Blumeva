import Admin from "../../model/adminSchema.js";
import bcrypt from "bcrypt";
import Joi from "joi";

const adminLoginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please enter a valid email address",
    "string.empty": "Email is required",
  }),
  password: Joi.string().min(4).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 4 characters long",
  }),
});

//  Login Page
const loadLogin = (req, res) => {
  if (req.session.admin) return res.redirect("/admin");
  res.render("admin/admin-login", { 
    layout: false, 
    message: null, 
    title: "Admin Login" });
};

// Login
const login = async (req, res) => {
  try {
   
    const { error } = adminLoginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin not found",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }
    req.session.admin = {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: "admin",
    };

    return res.status(200).json({
      success: true,
      message: "Admin logged in successfully",
      redirect: "/admin",
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

const logout = (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout Error:", err);
        return res.redirect("/admin");
      }
      res.clearCookie("connect.sid");
      res.redirect("/admin/login?logout=1");
    });
  } catch (error) {
    console.error("Admin Logout Error:", error);
    res.redirect("/admin");
  }
};

export default { loadLogin, login, logout };
