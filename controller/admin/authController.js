import { adminLoginSchema } from "../../validations/adminAuthValidation.js";
import { loginAdminService } from "../../services/adminAuthService.js";

const loadLogin = (req, res) => {
  if (req.session.admin) return res.redirect("/admin");
  
  res.render("admin/admin-login", {
    layout: false,
    message: null,
    title: "Admin Login",
  });
};

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
    const result = await loginAdminService(email, password);

    if (!result.success) {
      return res.status(401).json(result);
    }

    req.session.admin = result.admin;

    return res.status(200).json({
      success: true,
      message: "Admin logged in successfully",
      redirect: "/admin",
    });
  } catch (err) {
    console.error("Admin Login Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};



export default { loadLogin, login};
