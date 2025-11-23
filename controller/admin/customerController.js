import User from "../../model/userSchema.js";

const customerInfo = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 3;

    const filter = search
      ? {
          $or: [
            { name: { $regex: new RegExp(`^${search}`, "i") } },
            { email: { $regex: new RegExp(`^${search}`, "i") } },
          ],
        }
      : {};

    const totalCustomers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalCustomers / limit);

    const customers = await User.find(filter)
      .collation({ locale: "en", strength: 2 }) 
      .sort({ createdAt:-1})
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const allCount = await User.countDocuments();
    const blockedCustomers = await User.countDocuments({ isBlocked: true });
    const activeCustomers = allCount - blockedCustomers;

    res.render("admin/customers", {
      layout: "layouts/admin",
      title: "Customers",
      pageCSS: "customer",
      activePage: "customers",
      customers,
      search,
      currentPage: page,
      totalPages,
      totalCustomers: allCount,
      activeCustomers,
      blockedCustomers,
    });
  } catch (err) {
    console.error("Customer error:", err);
    res.redirect("/admin/page-404");
  }
};


const viewCustomer = async (req, res) => {
  try {
    const id = req.params.id;
    const customer = await User.findById(id);

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
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isBlocked ? "blocked" : "unblocked"} successfully.`,
      isBlocked: user.isBlocked,
    });
  } catch (error) {
    console.error("  error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error ." });
  }
};

export default { customerInfo, viewCustomer, toggleBlock };

