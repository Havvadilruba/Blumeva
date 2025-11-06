const Category = require("../../model/categorySchema");
const Product = require("../../model/productSchema");
const Brand = require("../../model/brandSchema"); 

const loadLandingpage =  async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true })
      .sort({ createdAt: -1 })
      .limit(6);

    const latestProducts = await Product.find({ isBlocked: false })
      .populate("category")
      .sort({ createdAt: -1 })
      .limit(8);

    const brands = await Brand.find({ status: true }).sort({ createdAt: -1 }).limit(8);

    res.render("user/landing", {
      layout: "layouts/user",
      title: "Home | Blumeva",
      pageCSS: "/style/user/landing.css",
      user: req.session.user || null,
      categories,
      latestProducts,
      brands
    });
  } catch (error) {
    console.error("Landing Page Error:", error);
    res.status(500).send("Server Error");
  }
};

// Page not found
const pageNotFound = async (req, res) => {
  try {
    res.render("user/page-404", {
      layout: "layouts/userLayout",
      title: "Page Not Found | Blumeva",
      pageCSS: "/style/user/page404.css"
    });
  } catch (error) {
    console.log(error);
    res.redirect("/pageNotFound");
  }
};



module.exports = { loadLandingpage, pageNotFound };
