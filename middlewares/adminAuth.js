import Admin from "../model/adminSchema.js";


const adminAuth = async (req, res, next) => {
  try {
    if (!req.session.admin) return res.redirect("/admin/login");
    const admin = await Admin.findById(req.session.admin.id);
    if (!admin) {
      req.session.destroy(() => res.redirect("/admin/login"));
    } else {
      req.admin = admin;
      res.locals.admin = admin;
      next();
    }
  } catch (err) {
    console.error("adminAuth error:", err);
    res.status(500).send("Internal Server Error");
  }
};

const checkAdmin = async (req, res, next) => {
  try {
    console.log("checkAdmin running");
    res.locals.admin = null;
    if (req.session.admin) {
      const admin = await Admin.findById(req.session.admin.id);
      if (admin) res.locals.admin = admin;
      else delete req.session.admin;
    }
    next();
  } catch (err) {
    console.error("checkAdmin error:", err);
    res.locals.admin = null;
    next();
  }
};

export { adminAuth, checkAdmin };


