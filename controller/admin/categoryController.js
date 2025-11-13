import Category from "../../model/categorySchema.js";
import categoryValidation from "../../validations/categoryValidation.js";


// CATEGORY LIST
const categoryInfo = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    const filter = search
      ? { name: { $regex: new RegExp(`^${search}`, "i") } }
      : {};

    const totalCategories = await Category.countDocuments(filter);
    const totalPages = Math.ceil(totalCategories / limit);

    const categories = await Category.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.render("admin/categoryList", {
      layout: "layouts/admin",
      title: "Manage Categories",
      categories,
      currentPage: page,
      totalPages,
      search,
      pageCSS: "categoryList",
      activePage: "categoryList",
    });
  } catch (error) {
    console.error("Error :", error);
    res.redirect("/admin/page-404");
  }
};



//  ADD CATEGORY PAGE
const loadAddCategory = async (req, res) => {
  try {
    res.render("admin/addCategory", {
      layout: "layouts/admin",
      title: "Add New Category",
      pageCSS: "addCategory",
      activePage: "addCategory",
    });
  } catch {
    res.redirect("/admin/page-404");
  }
};


// ADD CATEGORY 
const addCategory = async (req, res) => {
  try {
    const { name } = req.body;

    const { error } = categoryValidation.validate({ name });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a category image",
      });
    }

    await Category.create({
      name,
      image: req.file.path,
      isListed: true,
    });

    res.status(201).json({
      success: true,
      message: "Category added successfully ",
      redirectUrl: "/admin/category",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while adding category",
    });
  }
};

// EDIT CATEGORY PAGE

const editCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.redirect("/admin/page-404");

    res.render("admin/editCategory", {
      layout: "layouts/admin",
      title: "Edit Category",
      pageCSS: "editCategory",
      activePage: "categoryList",
      category,
    });
  } catch {
    res.redirect("/admin/page-404");
  }
};


// UPDATE CATEGORY (PATCH)

const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const id = req.params.id;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const { error } = categoryValidation.validate({ name });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      _id: { $ne: id }, 
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: " this name already exists.",
      });
    }

    if (req.file) {
      category.image = req.file.path;
    }

    category.name = name;
    await category.save();

    res.json({
      success: true,
      message: "Category updated successfully ",
      redirectUrl: "/admin/category",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while updating category",
    });
  }
};



const toggleListStatus = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.isListed = !category.isListed;
    await category.save();

    res.status(200).json({
      success: true,
      message: `Category ${category.isListed ? "unblocked " : "blocked "} successfully`,
      isListed: category.isListed,
    });
  } catch (error) {
    console.error(" Toggle category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while toggling category",
    });
  }
};


export default{ categoryInfo, loadAddCategory, addCategory, editCategory, updateCategory, toggleListStatus };

