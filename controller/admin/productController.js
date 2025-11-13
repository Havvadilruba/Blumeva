import Product from "../../model/productSchema.js";
import Brand from "../../model/brandSchema.js";
import Variant from "../../model/variantSchema.js";
import Category from "../../model/categorySchema.js";
import productValidation from "../../validations/productValidation.js";
import variantValidation from "../../validations/variantValidation.js";
import cloudinary from "../../config/cloudinary.js";
import mongoose from "mongoose";


const toArray = (value) => (Array.isArray(value) ? value : [value]);

const formatVariants = (body) => {
  const quantityValue = toArray(body.quantityValue);
  const quantityType  = toArray(body.quantityType);
  const regularPrice  = toArray(body.regularPrice);
  const salePrice     = toArray(body.salePrice);
  const stock         = toArray(body.stock);

  const variants = [];

  for (let i = 0; i < quantityValue.length; i++) {
    variants.push({
      quantityValue: Number(quantityValue[i]),
      quantityType: quantityType[i],
      regularPrice: Number(regularPrice[i]),
      salePrice: Number(salePrice[i]),
      stock: Number(stock[i]),
    });
  }

  return variants;
};



const getProducts = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 3;

    const filter = search
      ? { name: { $regex: new RegExp(`^${search}`, "i") } }
      : {};

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

 
    const products = await Product.find(filter)
      .populate("brand category")
      .collation({ locale: "en", strength: 2 }) 
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    for (let product of products) {
      product.variants = await Variant.find({ productId: product._id }).lean();
    }

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
  try {
    const brands = await Brand.find({ status: true });
    const categories = await Category.find({ isListed: true });

    res.render("admin/productAdd", {
      layout: "layouts/admin",
      title: "Product Management",
      pageCSS: "productAdd",
      activePage: "products",
      brands,
      categories,
    });
  } catch (error) {
    console.error("Error loading add product page:", error);
    res.status(500).send("Server error");
  }
};

const addProduct = async (req, res) => {
  try {
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

    // Check images
    const files = req.files || [];
    if (!files.length || files.length < 3) {
      return res.status(400).json({
        success: false,
        message: ["Please upload at least 3 product images"],
      });
    }

    // Convert incoming form data
    const variants = formatVariants(req.body);

    if (!variants.length) {
      return res.status(400).json({
        success: false,
        message: ["Please add at least one variant"],
      });
    }

    // Validate each variant
    for (let v of variants) {
      const { error: variantError } = variantValidation.validate(v);
      if (variantError) {
        return res.status(400).json({
          success: false,
          message: [`Variant: ${variantError.details[0].message}`],
        });
      }
    }

    const existingProduct = await Product.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: ["Product name already exists"],
      });
    }


    const imageUrls = files.map((file) => file.path);
    const newProduct = await Product.create({
      name,
      brand,
      category,
      description,
      images: imageUrls,
    });

    for (let v of variants) {
      await Variant.create({ productId: newProduct._id, ...v });
    }

    res.status(200).json({
      success: true,
      redirectUrl: "/admin/products",
    });

  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({
      success: false,
      message: ["Server error"],
    });
  }
};


const loadEditProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const productData = await Product.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(productId) },
      },

      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },

      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },

      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
    ]);

    const product = productData[0];

    if (!product) {
      return res.status(404).send("Product not found");
    }

    const [brands, categories] = await Promise.all([
      Brand.find({ status: true }),
      Category.find({ isListed: true }),
    ]);

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
    console.error("Error :", err);
    res.status(500).send("Server error");
  }
};
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, brand, category, description, deletedImages } = req.body;

    // Validate 
    const { error: productError } = productValidation.validate(
      { name: name?.trim(), brand, category, description: description?.trim() },
      { abortEarly: true }
    );
    if (productError) {
      return res.status(400).json({
        success: false,
        message: [productError.details[0].message],
      });
    }

    // Check duplicate 
    const existingProduct = await Product.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      _id: { $ne: productId },
    });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: ["Another product with this name already exists."],
      });
    }

    //  variants
    const variants = formatVariants(req.body);

    if (!variants.length) {
      return res.status(400).json({
        success: false,
        message: ["Please add at least one variant"],
      });
    }

    // Validate variants
    for (let v of variants) {
      const { error: variantError } = variantValidation.validate(v);
      if (variantError) {
        return res.status(400).json({
          success: false,
          message: [`Variant: ${variantError.details[0].message}`],
        });
      }
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: ["Product not found"],
      });
    }

  
    let imagesToDelete = [];
    try {
      imagesToDelete = JSON.parse(deletedImages || "[]");
    } catch {}

    if (imagesToDelete.length > 0) {
      for (const imgUrl of imagesToDelete) {
        const publicId = imgUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`products/${publicId}`);
      }
      product.images = product.images.filter(
        (img) => !imagesToDelete.includes(img)
      );
    }

    const newFiles = req.files || [];
    if (newFiles.length > 0) {
      const newUrls = newFiles.map((f) => f.path);
      product.images.push(...newUrls);
    }

    product.name = name.trim();
    product.brand = brand;
    product.category = category;
    product.description = description.trim();
    await product.save();

    // Replace variants 
    await Variant.deleteMany({ productId });

    for (let v of variants) {
      await Variant.create({ productId, ...v });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      redirectUrl: "/admin/products",
    });

  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: [error.message || "Server error"],
    });
  }
};


const toggleProductStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    product.isBlocked = !product.isBlocked;
    await product.save();

    res.json({
      success: true,
      message: `Product ${product.isBlocked ? "blocked" : "unblocked"} successfully.`,
      isBlocked: product.isBlocked, 
    });
  } catch (err) {
    console.error("Error toggling product:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};




export default{ 
  getProducts, 
  loadAddProduct, 
  addProduct, 
  loadEditProduct, 
  updateProduct, 
  toggleProductStatus 
};


