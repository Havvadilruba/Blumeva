import Category from "../model/categorySchema.js";

export const findCategories = async (filter, page, limit) => {
  return await Category.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

export const countCategories = async (filter) => {
  return await Category.countDocuments(filter);
};

export const findCategoryById = async (id) => {
  return await Category.findById(id);
};

export const findCategoryByName = async (name, excludeId = null) => {
  const query = {
    name: { $regex: new RegExp(`^${name}$`, "i") },
  };

  if (excludeId) query._id = { $ne: excludeId };

  return await Category.findOne(query);
};

export const createCategory = async (data) => {
  return await Category.create(data);
};

export const updateCategory = async (category) => {
  return await category.save();
};
