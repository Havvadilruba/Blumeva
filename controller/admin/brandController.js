import brandValidation from "../../validations/brandValidation.js";
import {
  getBrandListService,
  addBrandService,
  editBrandService,
  toggleBrandStatusService,
} from "../../services/brandService.js";

const getBrands = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    const { brands, total } = await getBrandListService(search, page, limit);

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
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const result = await addBrandService(req.body.name, req.body.status, req.file?.path);
    if (!result.success) return res.status(400).json(result);

    res.status(201).json({
      success: true,
      message: "Brand added successfully",
      brand: result.brand,
    });
  } catch (error) {
    console.error("Error adding brand:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const editBrand = async (req, res) => {
  try {
    const { error } = brandValidation.validate({ name: req.body.name });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const result = await editBrandService(req.params.id, req.body.name, req.body.status, req.file?.path);
    if (!result.success) return res.status(400).json(result);

    res.status(200).json({ success: true, message: "Brand updated successfully" });
  } catch (error) {
    console.error("Error editing brand:", error);
    res.status(500).json({ success: false, message: "Server error while editing brand" });
  }
};

const toggleBrandStatus = async (req, res) => {
  try {
    const result = await toggleBrandStatusService(req.params.id);
    if (!result.success) return res.status(404).json(result);

    res.json({
      success: true,
      message: `Brand ${result.status ? "activated" : "deactivated"} successfully`,
      status: result.status,
    });
  } catch (error) {
    console.error("Toggle status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default { getBrands, addBrand, editBrand, toggleBrandStatus };


