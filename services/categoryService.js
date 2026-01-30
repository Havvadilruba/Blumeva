import {
  findCategories,
  countCategories,
  findCategoryById,
  findCategoryByName,
  createCategory,
  updateCategory,
} from "../repositories/categoryRepository.js";

export const categoryListService = async (search, page, limit) => {
  const filter = search ? { name: { $regex: new RegExp(`^${search}`, "i") } } : {};
  const total = await countCategories(filter);
  const categories = await findCategories(filter, page, limit);
  return { categories, total };
};

export const addCategoryService = async (name, imagePath) => {
  try {

    
    const existing = await findCategoryByName(name);
    if (existing) {
      return { success: false, message: "Category already exists" };
    }

    if (!imagePath) {
      return { success: false, message: "Please upload a category image" };
    }

    // Create category
    const newCategory = await createCategory({
      name,
      image: imagePath,
      isListed: true,
    });

    return { success: true };
  } catch (err) {
    console.error("=== ERROR IN ADD CATEGORY SERVICE ===");
    console.error("Error:", err);
    throw err; 
  }
};
export const updateCategoryService = async (id, name, imagePath) => {
  const category = await findCategoryById(id);
  if (!category) return { success: false, message: "Category not found" };

  const existing = await findCategoryByName(name, id);
  if (existing) return { success: false, message: "Category name already exists" };

  category.name = name;
  if (imagePath) category.image = imagePath;

  await updateCategory(category);

  return { success: true };
};

export const toggleCategoryStatusService = async (id) => {
  const category = await findCategoryById(id);
  if (!category) return { success: false, message: "Category not found" };

  category.isListed = !category.isListed;
  await updateCategory(category);

  return { success: true, isListed: category.isListed };
};
