import Category from "../../model/categorySchema.js";
import Product from "../../model/productSchema.js";
import Brand from "../../model/brandSchema.js";
import { ObjectId } from "mongodb";


const loadLandingpage =  async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true })
      .sort({ createdAt: -1 })
      .limit(6);

    const brands = await Brand.find({ status: true })
    .sort({ createdAt: -1 })
    .limit(6);

    const latestProducts = await Product.aggregate([
      {
        $match: { isBlocked: false }, 
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
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$productId", "$$productId"] },
                    { $gt: ["$stock", 0] },
                  ],
                },
              },
            },
            { $sort: { salePrice: 1 } },
            { $limit: 1 },
          ],
          as: "variants",
        },
      },
      { $unwind: "$variants" },
     
      {
        $sort: { createdAt: -1 },
      },
     
      {
        $limit: 5,
      },
     
      {
        $project: {
          _id: 1,
          name: 1,
          images: 1,
          avgRating: 1,
          "brand.name": 1,
          "category.name": 1,
          "variants.salePrice": 1,
          "variants.regularPrice": 1,
        },
      },
    ]);


    const user = res.locals?.user || null;
        
    res.render("user/landing", {
      layout: "layouts/user",
      title: "Home | Blumeva",
      pageCSS: "/style/user/landing.css",
      user,
      categories,
      brands,
      latestProducts,
    });
  } catch (error) {
    console.error("Landing Page Error:", error);
    res.status(500).send("Server Error");
  }
};


const listProducts = async (req, res) => {
  try {
    const query = req.query;
    const categoryName = query.category || "";
    const brandName = query.brand || "";
    const minPrice = query.priceMin;
    const maxPrice = query.priceMax;
    const rating = query.rating ? Number(query.rating) : null;
    const sort = query.sort || "";
    const searchQuery = query.q ? query.q.trim() : "";
    const currentPage = parseInt(query.page) || 1;

    const limit = 2;
    const skip = (currentPage - 1) * limit;

  
    const matchStage = {isBlocked: false,};

    if (searchQuery) {
      matchStage.name = { $regex: new RegExp("^" + searchQuery, "i") };
    }

    if (categoryName) {
      const category = await Category.findOne({ name: categoryName, isListed: true });
      if (category) matchStage.category = category._id;
    }

    if (brandName) {
      const brand = await Brand.findOne({ name: brandName, status: true });
      if (brand) matchStage.brand = brand._id;
    }

    if (rating) {
      matchStage.avgRating = { $gte: rating };
    }

   
    const sortStage = {};
    if (sort === "low") sortStage["variants.salePrice"] = 1;
    else if (sort === "high") sortStage["variants.salePrice"] = -1;
    else if (sort === "a-z") sortStage.name = 1;
    else if (sort === "z-a") sortStage.name = -1;
    else if (sort === "rating") sortStage.avgRating = -1;
    else sortStage.createdAt = -1;

    
    const priceStage = {};
    if (minPrice) priceStage["$gte"] = Number(minPrice);
    if (maxPrice) priceStage["$lte"] = Number(maxPrice);

    
    const pipeline = [
      { $match: matchStage },

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
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },

      {
        $lookup: {
          from: "variants",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$productId", "$$productId"] },
                    { $gt: ["$stock", 0] },
                  ],
                },
              },
            },
            { $sort: { salePrice: 1 } },
            { $limit: 1 },
          ],
          as: "variants",
        },
      },
      { $unwind: "$variants" },
    ];

    if (Object.keys(priceStage).length > 0) {
      pipeline.push({ $match: { "variants.salePrice": priceStage } });
    }

    if (Object.keys(sortStage).length > 0) {
      pipeline.push({ $sort: sortStage });
    }

    const countPipeline = [...pipeline];
    countPipeline.push({ $count: "totalDocuments" });
    const countResult = await Product.aggregate(countPipeline);
    const totalDocuments = countResult.length > 0 ? countResult[0].totalDocuments : 0;
    const totalPages = Math.ceil(totalDocuments / limit);

    pipeline.push({ $skip: skip }, { $limit: limit });


    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        images: 1,
        avgRating: 1,
        "brand.name": 1,
        "category.name": 1,
        regularPrice: "$variants.regularPrice",
        salePrice: "$variants.salePrice",
      },
    });

    const products = await Product.aggregate(pipeline);

    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ status: true });

    res.render("user/product-list", {
      layout: "layouts/user",
      title: "Products | Blumeva",
      pageCSS: "/style/user/product-list.css",
      categories,
      brands,
      products,
      query,
      currentPage,
      totalPages,
      pagination: {
        currentPage,
        totalPages,
        hasPrevPage: currentPage > 1,
        hasNextPage: currentPage < totalPages,
      },
    });
  } catch (error) {
    console.error("Error loading products:", error);
    res.status(500).send("Internal Server Error");
  }
};


// Page not found
const pageNotFound = async (req, res) => {
  try {
    res.render("user/page-404", {
      layout: "layouts/userLayout",
      title: "Page Not Found | Blumeva",
      pageCSS: "/style/user/page404.css"
    });
  } catch (error) {
    console.log(error);
    res.redirect("/pageNotFound");
  }
};

const loadProductDetail = async (req, res) => {
  try {
    const productId = req.params.id;

    const [product] = await Product.aggregate([
      { $match: { _id: new ObjectId(productId), isBlocked: false } },

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
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },
      {
        $lookup: {
          from: "variants",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$productId", "$$productId"] },
              },
            },
            { $sort: { salePrice: 1 } },
          ],
          as: "variants",
        },
      },
    ]);

    if (!product) {
      return res.status(404).render("user/page-404", {
        layout: "layouts/user",
        title: "Product Not Found | Blumeva",
        pageCSS: "/style/user/page404.css",
      });
    }

    const variant = product.variants.length ? product.variants[0] : null;

    res.render("user/product-detail", {
      layout: "layouts/user",
      title: `${product.name} | Blumeva`,
      pageCSS: "/style/user/product-detail.css",
      product,
      variant,
    });
  } catch (error) {
    console.error("Error loading product details:", error);
    res.status(500).send("Internal Server Error");
  }
};


export default{ 
  loadLandingpage, 
  pageNotFound, 
  listProducts, 
  loadProductDetail 
};

