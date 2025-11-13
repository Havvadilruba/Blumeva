import express from "express";
import authController from "../controller/admin/authController.js";
import adminController from "../controller/admin/adminController.js";
import { adminAuth, checkAdmin } from "../middlewares/adminAuth.js";
import customerController from "../controller/admin/customerController.js";
import categoryController from "../controller/admin/categoryController.js";
import upload from "../middlewares/multer.js";
import brandController from "../controller/admin/brandController.js";
import productController from "../controller/admin/productController.js";

const router = express.Router();


router.use(checkAdmin);

router.get("/page-404",adminController.pageNotFound)
router.get("/login",authController.loadLogin);
router.post("/login",authController.login)
router.get("/",adminAuth,adminController.loadDashboard)
router.post("/logout",adminController.logout)

router.get("/customers",adminAuth,customerController.customerInfo)
router.get('/customers/:id', adminAuth,customerController.viewCustomer);
router.patch("/customers/toggle/:id", adminAuth, customerController.toggleBlock);

router.get("/category", adminAuth, categoryController.categoryInfo);
router.get("/category/add", adminAuth, categoryController.loadAddCategory);
router.post("/addCategory",adminAuth,upload.single("image"),categoryController.addCategory);
router.get("/category/edit/:id", adminAuth, categoryController.editCategory);
router.patch("/category/update/:id",adminAuth,upload.single("image"),categoryController.updateCategory);
router.patch("/category/toggle/:id",adminAuth,categoryController.toggleListStatus);

router.get("/brands", adminAuth, brandController.getBrands);
router.post("/brands/add", adminAuth, upload.single("logo"), brandController.addBrand);
router.patch("/brands/toggle/:id", adminAuth, brandController.toggleBrandStatus);
router.patch("/brands/edit/:id", adminAuth, upload.single("logo"), brandController.editBrand);

router.get("/products", adminAuth, productController.getProducts);
router.get("/products/add",adminAuth, productController.loadAddProduct)
router.post("/products/add",adminAuth,upload.array("images",5), productController.addProduct)
router.get("/products/edit/:id", adminAuth, productController.loadEditProduct);
router.patch("/products/:id", adminAuth, upload.array("images", 5), productController.updateProduct);
router.patch("/products/toggle/:id", adminAuth, productController.toggleProductStatus);

export default router;