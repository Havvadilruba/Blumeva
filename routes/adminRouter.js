const express=require("express")
const router=express.Router()
const authController=require("../controller/admin/authController")
const adminController=require("../controller/admin/adminController")
const adminAuth=require("../middlewares/adminAuth.js")
const customerController = require("../controller/admin/customerController");
const categoryController=require("../controller/admin/categoryController")
const upload = require("../middlewares/multer");
const brandController = require("../controller/admin/brandController");


router.get("/page-404",adminController.pageNotFound)
router.get("/login",authController.loadLogin);
router.post("/login",authController.login)
router.get("/",adminAuth,adminController.loadDashboard)
router.post("/logout",adminController.logout)

router.get("/customers",adminAuth,customerController.customerInfo)
router.get('/customers/:id', adminAuth,customerController.viewCustomer);
router.post("/customers/toggle/:id", adminAuth,customerController.toggleBlock);

router.get("/category", adminAuth, categoryController.categoryInfo);
router.get("/category/add", adminAuth, categoryController.loadAddCategory);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.get("/category/edit/:id", adminAuth, categoryController.editCategory);
router.post("/category/update/:id", adminAuth, categoryController.updateCategory);
router.post("/category/toggle/:id", adminAuth, categoryController.toggleListStatus);



router.get("/brands", adminAuth, brandController.getBrands);
router.post("/brands/add", adminAuth, upload.single("logo"), brandController.addBrand);
router.post("/brands/toggle/:id", adminAuth, brandController.toggleBrandStatus);
router.post("/brands/edit/:id", adminAuth, upload.single("logo"), brandController.editBrand);

module.exports=router