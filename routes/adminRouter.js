// routes/adminRouter.js

import express from "express";
import authController from "../controller/admin/authController.js";
import adminController from "../controller/admin/adminController.js";
import { adminAuth, checkAdmin } from "../middlewares/adminAuth.js";
import customerController from "../controller/admin/customerController.js";
import categoryController from "../controller/admin/categoryController.js";
import upload from "../middlewares/multer.js";
import brandController from "../controller/admin/brandController.js";
import productController from "../controller/admin/productController.js";
import orderController from "../controller/admin/orderController.js";
import offerController from "../controller/admin/offerController.js";
import couponController from "../controller/admin/couponController.js";
import adminReferralController from "../controller/admin/adminReferralController.js";
import salesReportController from "../controller/admin/salesReportController.js";
import dashboardController from "../controller/admin/dashboardController.js";
import bannerController from "../controller/admin/bannerController.js";


const router = express.Router();

router.use(checkAdmin);


router.get("/page-404", adminController.pageNotFound);
router.get("/login", authController.loadLogin);
router.post("/login", authController.login);
router.post("/logout", adminController.logout);

router.get("/",adminAuth, dashboardController.loadDashboard)


router.get("/customers", adminAuth, customerController.customerInfo);
router.get('/customers/:id', adminAuth, customerController.viewCustomer);
router.patch("/customers/toggle/:id", adminAuth, customerController.toggleBlock);


router.get("/category", adminAuth, categoryController.categoryInfo);
router.get("/category/add", adminAuth, categoryController.loadAddCategory);
router.post("/category/add", adminAuth, upload.single("image"), categoryController.addCategory);
router.get("/category/edit/:id", adminAuth, categoryController.editCategory);
router.patch("/category/update/:id", adminAuth, upload.single("image"), categoryController.updateCategory);
router.patch("/category/toggle/:id", adminAuth, categoryController.toggleListStatus);


router.get("/brands", adminAuth, brandController.getBrands);
router.post("/brands/add", adminAuth, upload.single("logo"), brandController.addBrand);
router.patch("/brands/toggle/:id", adminAuth, brandController.toggleBrandStatus);
router.patch("/brands/edit/:id", adminAuth, upload.single("logo"), brandController.editBrand);


router.get("/products/search", adminAuth, offerController.searchProducts);
router.get("/products", adminAuth, productController.getProducts);
router.get("/products/add", adminAuth, productController.loadAddProduct);
router.post("/products/add", adminAuth, upload.array("images", 5), productController.addProduct);
router.get("/products/edit/:id", adminAuth, productController.loadEditProduct);
router.patch("/products/:id", adminAuth, upload.array("images", 5), productController.updateProduct);
router.patch("/products/toggle/:id", adminAuth, productController.toggleProductStatus);

router.get("/orders", adminAuth, orderController.loadOrders); 
router.get("/orders/:id", adminAuth, orderController.loadOrderDetail);
router.patch("/orders/:id/status", adminAuth, orderController.updateOrderStatus);
router.patch("/orders/:id/return-request", adminAuth, orderController.handleReturnRequest);
router.patch("/orders/:id/mark-returned", adminAuth, orderController.markItemReturned);


router.get("/offers", adminAuth, offerController.loadOffers);
router.post("/offers", adminAuth, offerController.addOffer);
router.get("/offers/:id", adminAuth, offerController.getOfferById);
router.put("/offers/:id", adminAuth, offerController.editOffer);
router.patch("/offers/:id/toggle-status", adminAuth, offerController.toggleOfferStatus);
router.delete("/offers/:id", adminAuth, offerController.deleteOffer);

router.get("/coupons", adminAuth, couponController.loadCoupons);
router.post("/coupons", adminAuth, couponController.addCoupon);
router.get("/coupons/:couponId", adminAuth, couponController.getCoupon);
router.put("/coupons/:couponId", adminAuth, couponController.editCoupon);
router.patch("/coupons/:couponId/toggle-status", adminAuth, couponController.toggleCouponStatus);
router.delete("/coupons/:couponId", adminAuth, couponController.deleteCoupon);
router.get("/referrals", adminAuth, adminReferralController.listReferrals);

router.get("/salesReport", adminAuth, salesReportController.loadSalesReport);
router.get("/sales-report/excel", adminAuth, salesReportController.loadSalesReportDownload);
router.get("/sales-report/pdf", adminAuth, salesReportController.loadSalesReportPDF);

router.get("/banners", adminAuth, bannerController.loadBanners);
router.get("/banners/:id", adminAuth, bannerController.getBanner);
router.post("/banners",adminAuth,upload.single("bannerImage"),bannerController.addBanner);
router.put("/banners/:id",adminAuth,upload.single("bannerImage"),bannerController.updateBanner);
router.patch("/banners/:id/toggle",adminAuth,bannerController.toggleBannerStatus);
router.delete("/banners/:id",adminAuth,bannerController.deleteBanner);

export default router;