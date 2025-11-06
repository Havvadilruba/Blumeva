const Category = require("../../model/categorySchema");
const cloudinary = require("../../config/cloudinary");

// Categories
const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const categoryData = await Category.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);

    res.render("admin/categoryList", {
      layout: "layouts/admin",           
      title: "Manage Categories",
      categories: categoryData,
      currentPage: page,
      totalPages,
      pageCSS: "categoryList",               
      activePage: "categoryList",        
    });
  } catch (error) {
    console.log("Error loading categories:", error);
    res.redirect("/admin/page-404");
  }
};

// Add Category Page
const loadAddCategory = async (req, res) => {
  try {
    res.render("admin/addCategory", {
      layout: "layouts/admin",
      title: "Add New Category",
      pageCSS: "addCategory",
      activePage: "addCategory",
    });
  } catch (error) {
    console.log("Error loading Add Category page:", error);
    res.redirect("/admin/page-404");
  }
};

//Add Category
const addCategory = async (req, res) => {
  try {
    const { name, imageBase64 } = req.body;

    if (!name || !imageBase64) {
      return res.status(400).json({ error: "Please fill all fields" });
    }

    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }

    
    let imageToUpload = imageBase64;
    if (!imageBase64.startsWith("data:image")) {
      imageToUpload = `data:image/jpeg;base64,${imageBase64}`;
    }

  
    const uploadResponse = await cloudinary.uploader.upload(imageToUpload, {
      folder: "blumeva/categories",
    });

    const newCategory = new Category({
      name,
      image: uploadResponse.secure_url,
      isListed: true,
    });

    await newCategory.save();
    res.redirect("/admin/category");
  } catch (error) {
    console.log("Error adding category:", error);
    res.redirect("/admin/page-404");
  }
};

// Edit Page
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
  } catch (error) {
    console.log("Error loading edit page:", error);
    res.redirect("/admin/page-404");
  }
};

//Update Category
const updateCategory = async (req, res) => {
  try {
    const { name, imageBase64 } = req.body;
    const categoryId = req.params.id;

    const category = await Category.findById(categoryId);
    if (!category) return res.redirect("/admin/page-404");

    let image = category.image;

    if (imageBase64 && imageBase64.startsWith("data:image")) {
      const uploadResponse = await cloudinary.uploader.upload(imageBase64, {
        folder: "blumeva/categories",
      });
      image = uploadResponse.secure_url;
    }

    await Category.findByIdAndUpdate(categoryId, { name, image });
    res.redirect("/admin/category");
  } catch (error) {
    console.log("Error updating category:", error);
    res.redirect("/admin/page-404");
  }
};


// Toggle
const toggleListStatus = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.redirect("/admin/page-404");

    category.isListed = !category.isListed;
    await category.save();

    res.redirect("/admin/category");
  } catch (error) {
    console.log("Error toggling list status:", error);
    res.redirect("/admin/page-404");
  }
};

module.exports = {
  categoryInfo,
  loadAddCategory,
  addCategory,
  editCategory,
  updateCategory,
  toggleListStatus,
};


