import Brand from "../../model/brandSchema.js";
import brandValidation from "../../validations/brandValidation.js";


const getBrands = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    const filter = search
      ? { name: { $regex: new RegExp(`^${search}`, "i") } }
      : {};

    const total = await Brand.countDocuments(filter);

    const brands = await Brand.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.render("admin/brandList", {
      layout: "layouts/admin",
      title: "Brands Management",
      activePage: "brands",
      pageCSS: "brandList",
      brands,
      search,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error:", error);
    res.render("admin/brandList", {
      layout: "layouts/admin",
      title: "Brands Management",
      activePage: "brands",
      brands: [],
      search: "",
      currentPage: 1,
      totalPages: 1,
    });
  }
};

const addBrand = async (req, res) => {
  try {
    const { error } = brandValidation.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { name, status } = req.body;

    const existing = await Brand.findOne({ name: new RegExp(`^${name}$`, "i") });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Brand name already exists",
      });
    }

    if (!req.file?.path) {
      return res.status(400).json({
        success: false,
        message: "Please upload a brand logo",
      });
    }

    const brand = await Brand.create({
      name,
      logo: req.file.path,
      status: status === "on",
    });

    res.status(201).json({
      success: true,
      message: "Brand added successfully",
      brand,
    });
  } catch (error) {
    console.error("Error adding brand:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const editBrand = async (req, res) => {
  try {
    const { name, status } = req.body;

    const { error } = brandValidation.validate({ name });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    if (brand.name.toLowerCase() !== name.toLowerCase()) {
      const existing = await Brand.findOne({ name: new RegExp(`^${name}$`, "i") });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Brand name already exists",
        });
      }
    }

    brand.name = name;
    brand.status = status === "on";
    if (req.file?.path) brand.logo = req.file.path; 

    await brand.save();

    res.status(200).json({
      success: true,
      message: "Brand updated successfully",
    });
  } catch (error) {
    console.error(" Error editing brand:", error);
    res.status(500).json({
      success: false,
      message: "Server error while editing brand",
    });
  }
};

const toggleBrandStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    brand.status = !brand.status;
    await brand.save();

    res.json({
      success: true,
      message: `Brand ${brand.status ? "activated " : "deactivated "} successfully`,
      status: brand.status,
    });
  } catch (error) {
    console.error("Toggle status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error ",
    });
  }
};

export default{ getBrands, addBrand, editBrand, toggleBrandStatus };

