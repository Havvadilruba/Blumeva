

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

const logout = (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout Error:", err);
        return res.redirect("/admin");
      }
      res.clearCookie("adminSession");
      res.redirect("/admin/login?logout=1");
    });
  } catch (error) {
    console.error("Admin Logout Error:", error);
    res.redirect("/admin");
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

export default{ loadDashboard, logout, pageNotFound };



