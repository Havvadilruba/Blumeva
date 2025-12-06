import categoryValidation from "../../validations/categoryValidation.js";
import {
  categoryListService,
  addCategoryService,
  updateCategoryService,
  toggleCategoryStatusService,
} from "../../services/categoryService.js";

import { findCategoryById } from "../../repositories/categoryRepository.js";
const categoryInfo = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    const { categories, total } = await categoryListService(search, page, limit);

    res.render("admin/categoryList", {
      layout: "layouts/admin",
      title: "Manage Categories",
      categories,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      search,
      pageCSS: "categoryList",
      activePage: "categoryList",
    });
  } catch (error) {
    console.error("Error:", error);
    res.redirect("/admin/page-404");
  }
};


const loadAddCategory = async (req, res) => {
  res.render("admin/addCategory", {
    layout: "layouts/admin",
    title: "Add New Category",
    pageCSS: "addCategory",
    activePage: "addCategory",
  });
};


const addCategory = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate name
    const { error } = categoryValidation.validate({ name });
    if (error) {
      console.log("Validation failed:", error.details[0].message);
      return res.status(400).json({ 
        success: false, 
        message: error.details[0].message 
      });
    }

    // Check if file exists
    if (!req.file) {
      console.log("No file uploaded");
      return res.status(400).json({ 
        success: false, 
        message: "Please upload a category image" 
      });
    }

    // Call service
    const result = await addCategoryService(name, req.file.path);
  

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(201).json({
      success: true,
      message: "Category added successfully",
      redirectUrl: "/admin/category",
    });
  } catch (err) {
  
    
    return res.status(500).json({ 
      success: false, 
      message: "Server error: " + err.message 
    });
  }
};
const editCategory = async (req, res) => {
  try {
    const category = await findCategoryById(req.params.id);
    if (!category) return res.redirect("/admin/page-404");

    res.render("admin/editCategory", {
      layout: "layouts/admin",
      title: "Edit Category",
      pageCSS: "editCategory",
      activePage: "categoryList",
      category,
    });
  }catch (err) {
  console.error("Edit Category Error:", err)
  res.redirect("/admin/page-404");
}
};


const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;

    const { error } = categoryValidation.validate({ name });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const result = await updateCategoryService(req.params.id, name, req.file?.path);
    if (!result.success) return res.status(400).json(result);

    res.json({ success: true, message: "Category updated successfully", redirectUrl: "/admin/category" });
  } catch {
    res.status(500).json({ success: false, message: "Server error while updating category" });
  }
};


const toggleListStatus = async (req, res) => {
  try {
    const result = await toggleCategoryStatusService(req.params.id);
    if (!result.success) return res.status(404).json(result);

    res.status(200).json({
      success: true,
      message: `Category ${result.isListed ? "unblocked" : "blocked"} successfully`,
      isListed: result.isListed,
    });
  } catch {
    res.status(500).json({ success: false, message: "Server error while toggling category" });
  }
};


export default { categoryInfo, loadAddCategory, addCategory, editCategory, updateCategory, toggleListStatus };
