import { getLandingPageData } from "../../services/landingService.js";
import { getFilteredProducts } from "../../services/productListUserService.js";
import { getProductDetail } from "../../services/productDetailService.js";
import { getLiveBannerService } from "../../services/bannerService.js";

import assets from "../../helpers/assets.js";

import Product from "../../model/productSchema.js"


// Landing Page
export const loadLandingpage = async (req, res) => {
  try {
    const userId = req.session?.user?._id || null;  // <-- Pass userId safely
     const banner = await getLiveBannerService();
    const { categories, brands, latestProducts } = await getLandingPageData(userId);

    res.render("user/landing", {
      layout: "layouts/user",
      title: "Home | Blumeva",
      pageCSS: "/style/user/landing.css",
      categories,
      brands,
       banner,
      latestProducts,
      assets
    });

  } catch (err) {
    console.error("Landing Page Error:", err);
    res.redirect("/pageNotFound");
  }
};


// Product Listing
export const listProducts = async (req, res) => {
  try {
    const userId = req.session?.user?._id || null;
    const data = await getFilteredProducts(req.query, userId);
    
   const isAjax = req.xhr || 
                   req.headers.accept?.includes('application/json') ||
                   req.headers['x-requested-with'] === 'XMLHttpRequest';
    
    if (isAjax) {
      return res.json({
        success: true,
        products: data.products,
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        categories: data.categories,  
        brands: data.brands,          
        query: req.query
      });
    }
    
   
    res.render("user/product-list", {
      layout: "layouts/user",
      title: "Products | Blumeva",
      pageCSS: "/style/user/product-List.css",
      ...data,
      query: req.query,
      pagination: {
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        hasPrevPage: data.currentPage > 1,
        hasNextPage: data.currentPage < data.totalPages,
      },
    });

  } catch (error) {
    console.error("List Products Error:", error);
    
    const isAjax = req.xhr || 
                   req.headers.accept?.includes('application/json') ||
                   req.headers['x-requested-with'] === 'XMLHttpRequest';
    
    if (isAjax) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch products"
      });
    }
    
    res.redirect("/pageNotFound");
  }
};


export const loadProductDetail = async (req, res) => {
  const userId = req.session?.user?._id || req.user?._id;
  const result = await getProductDetail(req.params.id, userId);
  
  if (!result) return res.redirect("/products");
  
  const { latestProducts } = await getLandingPageData(userId);
  const { product, variant, offer, isInWishlist, reviews, avgRating } = result;

    if (result.blocked) {
  return res.render("user/product-detail", {
    layout: "layouts/user",
    title: `${result.product.name} | Blumeva`,
    pageCSS: "/style/user/product-detail.css",
    product: result.product, 
    blocked: true,
    warningMessage: result.message,
     variant: result.variant,   
    offer: result.offer || 0, 
    isInWishlist: false,
    reviews: [],
    avgRating: 0,
    latestProducts,
  });
}

  
  res.render("user/product-detail", {
    layout: "layouts/user",
    title: `${product.name} | Blumeva`,
    pageCSS: "/style/user/product-detail.css",
    product,
    variant,
    offer,
    isInWishlist,
    reviews,      
    avgRating,  
    latestProducts ,
     blocked: false,
    warningMessage: null
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


export const loadContactPage = async (req, res) => {
  try {
    res.render("user/contact", {
      layout: "layouts/user",
      title: "Contact Us | Blumeva",
      pageCSS: "/style/user/contact.css"
    });
  } catch (error) {
    console.error("Contact Page Error:", error);
    res.redirect("/pageNotFound");
  }
};

export const loadAboutPage = async (req, res) => {
  try {
    res.render("user/about", {
      layout: "layouts/user",
      title: "About Us | Blumeva",
      pageCSS: "/style/user/about.css"
    });
  } catch (error) {
    console.error("About Page Error:", error);
    res.redirect("/pageNotFound");
  }
};
export default{ 
  loadLandingpage, 
  pageNotFound, 
  listProducts, 
  loadProductDetail ,
  loadContactPage,
  loadAboutPage
};