import User from "../model/userSchema.js";
import mongoose from "mongoose";

const userAuth = async (req, res, next) => {
  try {
    if (!req.session.user) {

      if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.status(401).json({ success: false, message: "Login required" });
      }

      return res.redirect("/login");
    }

    const userId = req.session.user._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const user = await User.findById(userId);
    if (!user || user.isBlocked) {
      req.session.destroy();
      return res.redirect("/login?message=blocked");
    }

    req.user = user;
    res.locals.user = user;

    next();
  } catch (err) {
    console.error("userAuth error:", err);
    res.status(500).send("Internal Server Error");
  }
};

const checkUser = async (req, res, next) => {
  try {
    if (req.session?.user?._id) {
      const userId = req.session.user._id;

      if (mongoose.Types.ObjectId.isValid(userId)) {
        const user = await User.findById(userId).lean();

        if (user && !user.isBlocked) {
          res.locals.user = user;
        } else {
          req.session.destroy();
        }
      } else {
        req.session.destroy();
      }
    }


    next();
  } catch (err) {
    console.error("checkUser error:", err);
    next();
  }
};


export { userAuth, checkUser };