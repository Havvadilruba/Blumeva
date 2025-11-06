
module.exports = (req, res, next) => {
  
  res.locals.flash = {
    success: req.flash("success_msg") || [],
    error: req.flash("error_msg") || [],
    warning: req.flash("warning_msg") || []
  };
  next();
};
