import Product from "../model/productSchema.js";
import Brand from "../model/brandSchema.js";
import Category from "../model/categorySchema.js";
import Variant from "../model/variantSchema.js";
import { ObjectId } from "mongodb";

// =========================
// Admin product listing
// =========================

export const findProducts = async (filter, page, limit) => {
  return Product.find(filter)
    .populate("brand category")
    .collation({ locale: "en", strength: 2 })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

export const countProducts = async (filter) => {
  return Product.countDocuments(filter);
};

export const findProductById = async (id) => {
  return Product.findById(id);
};

export const findProductByName = async (name, excludeId = null) => {
  const query = {
    name: { $regex: new RegExp(`^${name}$`, "i") }
  };

  if (excludeId) query._id = { $ne: excludeId };

  return Product.findOne(query);
};

export const createProduct = async (data) => {
  return Product.create(data);
};

export const updateProductDoc = async (product) => {
  return product.save();
};

export const getActiveBrandsAndCategories = async () => {
  return Promise.all([
    Brand.find({ status: true }),
    Category.find({ isListed: true })
  ]);
};

// =========================
// VARIANTS
// =========================

export const createVariant = async (data) => {
  return Variant.create(data);
};

export const updateVariant = async (id, data) => {
  return Variant.findByIdAndUpdate(id, data, { new: true });
};

export const deleteVariants = async (ids) => {
  return Variant.deleteMany({ _id: { $in: ids } });
};

export const findVariantsByProduct = async (productId) => {
  return Variant.find({ productId }).lean();
};

