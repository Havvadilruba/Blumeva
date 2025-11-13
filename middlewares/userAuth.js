import User from "../model/userSchema.js";
import mongoose from "mongoose";


const userAuth = async (req, res, next) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const user = await User.findById(req.session.user.id);
    if (!user || user.isBlocked) {
      delete req.session.user;
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
    res.locals.user = null;

    if (req.session && req.session.user && req.session.user.id) {
      const userId = req.session.user.id;

      if (mongoose.Types.ObjectId.isValid(userId)) {
        const user = await User.findById(userId).lean();

        if (user && !user.isBlocked) {
          res.locals.user = user;
        } else {
          delete req.session.user; 
        }
      } else {
        delete req.session.user;
      }
    }

    next();
  } catch (err) {
    console.error("checkUser error:", err);
    res.locals.user = null;
    next();
  }
};
export { userAuth, checkUser };

