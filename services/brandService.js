import {
  findBrands,
  countBrands,
  findBrandById,
  findBrandByName,
  createBrand,
  updateBrand,
} from "../repositories/brandRepository.js";

export const getBrandListService = async (search, page, limit) => {
  const filter = search ? { name: { $regex: new RegExp(`^${search}`, "i") } } : {};
  const total = await countBrands(filter);
  const brands = await findBrands(filter, page, limit);
  return { brands, total };
};

export const addBrandService = async (name, status, logoPath) => {
  const existing = await findBrandByName(name);
  if (existing) return { success: false, message: "Brand name already exists" };

  if (!logoPath) return { success: false, message: "Please upload a brand logo" };

  const newBrand = await createBrand({
    name,
    status: status === "on",
    logo: logoPath,
  });

  return { success: true, brand: newBrand };
};

export const editBrandService = async (id, name, status, logoPath) => {
  const brand = await findBrandById(id);
  if (!brand) return { success: false, message: "Brand not found" };

  if (brand.name.toLowerCase() !== name.toLowerCase()) {
    const existing = await findBrandByName(name);
    if (existing) return { success: false, message: "Brand name already exists" };
  }

  brand.name = name;
  brand.status = status === "on";
  if (logoPath) brand.logo = logoPath;

  await updateBrand(brand);

  return { success: true };
};

export const toggleBrandStatusService = async (id) => {
  const brand = await findBrandById(id);
  if (!brand) return { success: false, message: "Brand not found" };

  brand.status = !brand.status;

  await updateBrand(brand);

  return { success: true, status: brand.status };
};
