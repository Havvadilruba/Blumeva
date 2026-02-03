import {
  findProducts,
  countProducts,
  findProductById,
  findProductByName,
  createProduct,
  updateProductDoc,
  createVariant,
  updateVariant,
  deleteVariants,
  getActiveBrandsAndCategories,
  findVariantsByProduct,
} from "../repositories/productRepository.js";

import cloudinary from "../config/cloudinary.js";

export const getProductListService = async (search, page, limit) => {
  const filter = search
    ? { name: { $regex: new RegExp(`^${search}`, "i") } }
    : {};

  const totalProducts = await countProducts(filter);
  const products = await findProducts(filter, page, limit);

  for (let product of products) {
    product.variants = await findVariantsByProduct(product._id);
  }

  return {
    products,
    totalPages: Math.ceil(totalProducts / limit),
  };
};

export const loadAddProductService = async () => {
  return await getActiveBrandsAndCategories();
};

export const addProductService = async (body, files, variants) => {
  const { name, brand, category, description } = body;

  const existing = await findProductByName(name);
  if (existing) return { success: false, message: ["Product name already exists"] };

  if (!files.length || files.length < 3) {
    return { success: false, message: ["Please upload at least 3 images"] };
  }

  // const imageUrls = files.map((file) => file.path);
   const imageUrls = [];

  // ✅ upload images manually
  for (const file of files) {
    const result = await cloudinary.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
      { folder: "products" }
    );

    imageUrls.push(result.secure_url);
  }

  const newProduct = await createProduct({
    name,
    brand,
    category,
    description,
    images: imageUrls,
  });

  for (let v of variants) {
    await createVariant({ productId: newProduct._id, ...v });
  }

  return { success: true, redirectUrl: "/admin/products" };
};

export const loadEditProductService = async (productDataPromise) => {
  return productDataPromise;
};

export const updateProductService = async (
  productId,
  body,
  variants,
  newFiles,
  deletedImages,
  deletedVariantIds,
  cloudinary
) => {
  const { name, brand, category, description } = body;

  const existed = await findProductByName(name, productId);
  if (existed)
    return { success: false, message: ["Another product already exists"] };

  const product = await findProductById(productId);
  if (!product) return { success: false, message: ["Product not found"] };

  let toDelete = [];
  try {
    toDelete = JSON.parse(deletedImages || "[]");
  } catch {}

  if (toDelete.length > 0) {
    for (const imgUrl of toDelete) {
      const publicId = imgUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`products/${publicId}`);
    }
    product.images = product.images.filter((img) => !toDelete.includes(img));
  }

  if (newFiles.length > 0) {
    const newUrls = newFiles.map((file) => file.path);
    product.images.push(...newUrls);
  }

  product.name = name.trim();
  product.brand = brand;
  product.category = category;
  product.description = description.trim();
  await updateProductDoc(product);

  const variantIds = Array.isArray(body.variantIds)
    ? body.variantIds
    : [body.variantIds];

  for (let i = 0; i < variants.length; i++) {
    if (variantIds[i]) {
      await updateVariant(variantIds[i], variants[i]);
    } else {
      await createVariant({ productId, ...variants[i] });
    }
  }

  if (deletedVariantIds) {
    let idsToDelete = [];
    try {
      idsToDelete = JSON.parse(deletedVariantIds);
    } catch {}
    if (idsToDelete.length) {
      await deleteVariants(idsToDelete);
    }
  }

  return { success: true, redirectUrl: "/admin/products" };
};

export const toggleProductStatusService = async (id) => {
  const product = await findProductById(id);
  if (!product) return { success: false, message: "Product not found" };

  product.isBlocked = !product.isBlocked;
  await updateProductDoc(product);

  return { success: true, isBlocked: product.isBlocked };
};
