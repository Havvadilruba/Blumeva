const Admin=require("../../model/adminSchema")
const mongoose=require("mongoose")
const bcrypt=require("bcrypt")
bcrypt.hash("admin123", 10).then(hash => console.log(hash));

const loadLogin = (req, res) => {
   if (req.session.admin) { 
    return res.redirect("/admin"); }

  res.render("admin/admin-login", {
    layout: false,
    message: null,
    title: "Admin Login",
  });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.render("admin/admin-login", {
        layout: false,
        message: "Admin not found",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.render("admin/admin-login", {
        layout: false,
        message: "Invalid password",
      });
    }
    req.session.admin = admin._id;

    res.redirect("/admin");
  } catch (error) {
    console.log("Error in admin login:", error);
    res.redirect("/admin/page-404");
  }
};


module.exports={loadLogin,login}