const express=require("express")
const router=express.Router()
const middle=require("../middlewares/userAuth");
const userController=require("../controller/user/userController")
const authController=require("../controller/user/authController")

router.use(middle.checkUser)
router.get("/pageNotFound",userController.pageNotFound)
router.get("/signup",authController.loadSignup)
router.post("/signup",authController.signup)
router.get("/",userController.loadLandingpage)
router.post("/verifyOtp",authController.verifyOtp)
router.post("/resendOtp", authController.resendOtp)
router.get("/login",authController.loadLogin)
router.post("/login",authController.login)
router.get("/logout",middle.userAuth, authController.logout);


module.exports=router;