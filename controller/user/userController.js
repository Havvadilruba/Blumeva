import { getLandingPageData } from "../../services/landingService.js";
import { getFilteredProducts } from "../../services/productListUserService.js";
import { getProductDetail } from "../../services/productDetailService.js";


// Landing Page
export const loadLandingpage = async (req, res) => {
  const { categories, brands, latestProducts } = await getLandingPageData();
  res.render("user/landing", {
    layout: "layouts/user",
    title: "Home | Blumeva",
    pageCSS: "/style/user/landing.css",
    categories,
    brands,
    latestProducts,
  });
};

// Product Listing
export const listProducts = async (req, res) => {
  const data = await getFilteredProducts(req.query);
  res.render("user/product-list", {
    layout: "layouts/user",
    title: "Products | Blumeva",
    pageCSS: "/style/user/product-list.css",
    ...data,
    query: req.query,
    pagination: {
      currentPage: data.currentPage,
      totalPages: data.totalPages,
      hasPrevPage: data.currentPage > 1,
      hasNextPage: data.currentPage < data.totalPages,
    },
  });
};

// Product Detail
export const loadProductDetail = async (req, res) => {
  const result = await getProductDetail(req.params.id);
  if (!result) return res.redirect("/products");

  res.render("user/product-detail", {
    layout: "layouts/user",
    title: `${result.product.name} | Blumeva`,
    pageCSS: "/style/user/product-detail.css",
    product: result.product,
    variant: result.variant,
  });
};


// Page not found
const pageNotFound = async (req, res) => {
  try {
    res.render("user/page-404", {
      layout: "layouts/user",
      title: "Page Not Found | Blumeva",
      pageCSS: "/style/user/page404.css"
    });
  } catch (error) {
    console.log(error);
    res.redirect("/pageNotFound");
  }
};



export default{ 
  loadLandingpage, 
  pageNotFound, 
  listProducts, 
  loadProductDetail 
};