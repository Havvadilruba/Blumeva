import Brand from "../model/brandSchema.js";

export const findBrands = async (filter, page, limit) => {
  return await Brand.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

export const countBrands = async (filter) => {
  return await Brand.countDocuments(filter);
};

export const findBrandById = async (id) => {
  return await Brand.findById(id);
};

export const findBrandByName = async (name) => {
  return await Brand.findOne({ name: new RegExp(`^${name}$`, "i") });
};

export const createBrand = async (data) => {
  return await Brand.create(data);
};

export const updateBrand = async (brand) => {
  return await brand.save();
};
