const User=require("../model/userSchema")

const userAuth = async (req, res, next) => {
  try {
    if (req.session.admin) {
      return res.redirect("/admin");
    }

    if (!req.session.user) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user);
    if (!user) {
      req.session.destroy(() => res.redirect("/login"));
    } else {
      req.user = user;
      next();
    }
  } catch (error) {
    console.log("Error in userAuth middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};
function checkUser(req, res, next) {
  if (req.session.user) {
    if (!req.session.userData) {
      User.findById(req.session.user)
        .then(user => {
          if (user) {
            res.locals.user = user; 
            req.session.userData = user; 
          } else {
            res.locals.user = null;
          }
          next();
        })
        .catch(err => {
          console.log("Error in checkUser middleware:", err);
          res.locals.user = null;
          next();
        });
    } else {
      res.locals.user = req.session.userData;
      next();
    }
  } else {
    res.locals.user = null;
    next();
  }
}
module.exports={userAuth,checkUser}