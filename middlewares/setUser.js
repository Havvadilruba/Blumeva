export const setUser = (req, res, next) => {
  if (!req.path.startsWith('/admin')) {
    res.locals.user = req.session?.user || null;
  }
  next();
};