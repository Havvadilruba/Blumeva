import {
  getCustomerListService,
  viewCustomerService,
  toggleCustomerBlockService,
} from "../../services/customerService.js";

const customerInfo = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 3;

    const { customers, total, allCount, active, blocked } =
      await getCustomerListService(search, page, limit);

    res.render("admin/customers", {
      layout: "layouts/admin",
      title: "Customers",
      pageCSS: "customer",
      activePage: "customers",
      customers,
      search,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalCustomers: allCount,
      activeCustomers: active,
      blockedCustomers: blocked,
    });
  } catch (err) {
    console.error("Customer error:", err);
    res.redirect("/admin/page-404");
  }
};

const viewCustomer = async (req, res) => {
  try {
    const customer = await viewCustomerService(req.params.id);
    if (!customer) return res.redirect("/admin/page-404");

    res.render("admin/customer-details", {
      layout: "layouts/admin",
      title: `Customer Details - ${customer.name}`,
      pageCSS: "customer-detail",
      activePage: "customers",
      customer,
    });
  } catch (err) {
    console.error("View customer error:", err);
    res.redirect("/admin/page-404");
  }
};

const toggleBlock = async (req, res) => {
  try {
    const result = await toggleCustomerBlockService(req.params.id);
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      message: `User ${result.isBlocked ? "blocked" : "unblocked"} successfully.`,
      isBlocked: result.isBlocked,
    });
  } catch (error) {
    console.error("Block toggle error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default { customerInfo, viewCustomer, toggleBlock };
