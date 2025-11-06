const Admin = require("../model/adminSchema"); 


const adminAuth = async (req, res, next) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/login");
    }

    const admin = await Admin.findById(req.session.admin);

    if (admin) {
      req.admin = admin;
      next();
    } else {
      req.session.destroy();
      res.redirect("/admin/login");
    }

  } catch (error) {
    console.log("Error in adminAuth middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = adminAuth;
