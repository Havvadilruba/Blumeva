const Brand = require("../../model/brandSchema");

// Brand List
const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find().sort({ createdAt: -1 });
      res.render("admin/brandList", {
      layout: "layouts/admin",
      title: "Brands Management",
      pageCSS: "brandList",  
      activePage: "brands",  
      brands,
    });
  } catch (error) {
    console.error("Error loading brands:", error);
    req.flash("error_msg", "Unable to load brands");
    res.redirect("/admin");
  }
};

// Add Brand
const addBrand = async (req, res) => {
  try {
    const { name } = req.body;

    if (!req.file) {
      req.flash("error_msg", "Please upload a brand logo");
      return res.redirect("/admin/brands");
    }

    const logo = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    await Brand.create({ name, logo });
    req.flash("success_msg", "Brand added successfully!");
    res.redirect("/admin/brands");
  } catch (error) {
    console.error("Error adding brand:", error);
    req.flash("error_msg", "Error adding brand");
    res.redirect("/admin/brands");
  }
};
const editBrand = async (req, res) => {
  try {
    const { name, status } = req.body;
    const updateData = {
      name,
      status: status === 'on',
    };

    if (req.file) {
      updateData.logo = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    await Brand.findByIdAndUpdate(req.params.id, updateData);
    req.flash("success_msg", "Brand updated successfully!");
    res.redirect("/admin/brands");
  } catch (error) {
    console.error("Error editing brand:", error);
    req.flash("error_msg", "Error updating brand");
    res.redirect("/admin/brands");
  }
};
// Toggle 
const toggleBrandStatus = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

    brand.status = !brand.status;
    await brand.save();

    res.json({ success: true, status: brand.status });
  } catch (error) {
    console.error("Toggle status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getBrands, editBrand,addBrand, toggleBrandStatus };
