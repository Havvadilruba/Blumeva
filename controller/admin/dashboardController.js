
import {
 getDashboardPageService
} from "../../services/dashboardService.js";

export const loadDashboard = async (req, res) => {
  const filter = req.query.filter || "weekly";

  const dashboardData = await getDashboardPageService(filter);

  res.render("admin/dashboard", {
    layout: "layouts/admin",
    title: "Dashboard",
    pageCSS: "dashboard",
    activePage: "dashboard",
    filter,
    ...dashboardData, 
  });
};


export default {
  loadDashboard,
};
