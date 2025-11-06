const User = require("../../model/userSchema");
const Order = require("../../model/orderSchema");

const customerInfo = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = 3;

    const query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };

    console.log("Fetching customers...");

    const userData = await User.find(query)
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    console.log("Users found:", userData.length);
    const count = await User.countDocuments(query);

    // cards
    const totalCustomers = await User.countDocuments();
    const blockedCustomers = await User.countDocuments({ isBlocked: true });
    const activeCustomers = totalCustomers - blockedCustomers;

    res.render("admin/customers", {
      title: "Customers",
      layout: "layouts/admin",
      pageCSS: "customer",
      activePage: "customers", 
      customers: userData,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalCustomers,
      blockedCustomers,
      activeCustomers,
      search,
    });
  } catch (error) {
    console.log("Customer load error:", error);
    return res.redirect("/admin/page-404");
  }
};

const viewCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;

    const customer = await User.findById(customerId);
    if (!customer) {
      return res.redirect("/admin/page-404");
    }

    const orders = await Order.find({ userId: customerId })
      .sort({ createdAt: -1 })
      .lean();

    res.render("admin/customer-details", {
      layout: "layouts/admin",
      title: `Customer Details - ${customer.name}`,
      customer,
      pageCSS: "customer-detail",
      activePage: "customers", 
      orders,
    });
  } catch (error) {
    console.error("View customer error:", error);
    res.redirect("/admin/page-404");
  }
};

const toggleBlock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.redirect("/admin/page-404");

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.redirect("/admin/customers/" + req.params.id);
  } catch (error) {
    console.log("Block toggle error:", error);
    res.redirect("/admin/page-404");
  }
};

module.exports = { customerInfo, viewCustomer, toggleBlock };
