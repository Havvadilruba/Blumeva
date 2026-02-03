import cloudinary from "../../config/cloudinary.js";
import productValidation from "../../validations/productValidation.js";
import variantValidation from "../../validations/variantValidation.js";
import {
  getProductListService,
  loadAddProductService,
  addProductService,
  updateProductService,
  toggleProductStatusService
} from "../../services/productService.js";
import mongoose from "mongoose";
import Product from "../../model/productSchema.js";
import Variant from "../../model/variantSchema.js";
import Brand from "../../model/brandSchema.js";
import Category from "../../model/categorySchema.js";

const toArray = (value) => (Array.isArray(value) ? value : [value]);

const formatVariants = (body) => {
  const variants = [];
  const { quantityValue, quantityType, regularPrice, salePrice, stock } = body;

  for (let i = 0; i < toArray(quantityValue).length; i++) {
    variants.push({
      quantityValue: Number(toArray(quantityValue)[i]),
      quantityType: toArray(quantityType)[i],
      regularPrice: Number(toArray(regularPrice)[i]),
      salePrice: Number(toArray(salePrice)[i]),
      stock: Number(toArray(stock)[i]),
    });
  }
  return variants;
};

 const getProducts = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 3;

    const { products, totalPages } = await getProductListService(search, page, limit);

    res.render("admin/productList", {
      layout: "layouts/admin",
      title: "Product Management",
      pageCSS: "productList",
      activePage: "products",
      products,
      search,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Server error");
  }
};

const loadAddProduct = async (req, res) => {
  const [brands, categories] = await loadAddProductService();
  res.render("admin/productAdd", {
    layout: "layouts/admin",
    title: "Add Product",
    pageCSS: "productAdd",
    activePage: "products",
    brands,
    categories,
  });
};

const addProduct = async (req, res) => {
  try {

    console.log(req.files.map(f => f.originalname));

    const { name, brand, category, description } = req.body;

    // Validate product
    const { error: productError } = productValidation.validate(
      { name, brand, category, description },
      { abortEarly: true }
    );

    if (productError) {
      return res.status(400).json({
        success: false,
        message: [productError.details[0].message],
      });
    }

    const variants = formatVariants(req.body);

    for (const v of variants) {
      const { error } = variantValidation.validate(v);
      if (error)
        return res.status(400).json({ success: false, message: [`Variant: ${error.details[0].message}`] });
    }

    const result = await addProductService(req.body, req.files, variants);
    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    console.error("Add Product Error:", error);
    return res.status(500).json({ success: false, message: ["Server error"] });
  }
};

 const loadEditProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const productData = await Product.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(productId) } },
      {
         $lookup: { from: "brands",
         localField: "brand",
          foreignField: "_id", 
          as: "brand"
         } },

      { $unwind: "$brand" },

      { $lookup: { from: "categories",
         localField: "category", 
         foreignField: "_id",
          as: "category"
         } },

      { $unwind: "$category" },
      
      { $lookup: { from: "variants",
         localField: "_id",
          foreignField: "productId", 
          as: "variants" 
        } },
    ]);

    const product = productData[0];
    if (!product) return res.status(404).send("Product not found");

    const [brands, categories] = await loadAddProductService();

    res.render("admin/productEdit", {
      layout: "layouts/admin",
      title: "Edit Product",
      pageCSS: "productAdd",
      activePage: "products",
      product,
      brands,
      categories,
      variants: product.variants,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

const updateProduct = async (req, res) => {
  try {
    const { name, brand, category, description } = req.body;

    const { error: productError } = productValidation.validate(
      { name, brand, category, description },
      { abortEarly: true }
    );

    if (productError) {
      return res.status(400).json({
        success: false,
        message: [productError.details[0].message],
      });
    }

    const variants = formatVariants(req.body);
       for (const v of variants) {
      const { error } = variantValidation.validate(v);
      if (error)
        return res.status(400).json({ success: false, message: [`Variant: ${error.details[0].message}`] });
    }

    const result = await updateProductService(
      req.params.id,
      req.body,
      variants,
      req.files,
      req.body.deletedImages,
      req.body.deletedVariantIds,
      cloudinary
    );

    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({ success: false, message: ["Server error"] });
  }
};

const toggleProductStatus = async (req, res) => {
  const result = await toggleProductStatusService(req.params.id);
  res.status(result.success ? 200 : 404).json(result);
};

export default {
  getProducts,
  loadAddProduct,
  addProduct,
  loadEditProduct,
  updateProduct,
  toggleProductStatus,
};
