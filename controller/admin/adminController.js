

const loadDashboard = async (req, res) => {
  try {
    res.render("admin/dashboard", {
      layout: "layouts/admin",
      title: "Admin Dashboard",
      pageCSS: "dashboard",
      activePage: "dashboard", 
    });
  } catch (error) {
    console.log("Error loading dashboard:", error);
    res.redirect("/admin/page-404");
  }
};

const logout = async (req, res) => {
  try {
    req.session.admin = null;
    res.redirect("/admin/login");
  } catch (error) {
    console.log("Error during logout:", error);
    res.redirect("/admin/page-404");
  }
};

const pageNotFound = (req, res) => {
  res.status(404).render("admin/page-404", {
    layout: "layouts/admin",
    title: "Page Not Found",
    pageCSS: "error",
    activePage: "", 
  });
};

module.exports = {
  loadDashboard,
  logout,
  pageNotFound,
};



