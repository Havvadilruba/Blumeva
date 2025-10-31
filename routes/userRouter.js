const express=require("express")
const router=express.Router()
const userController=require("../controller/user/userController")
const authController=require("../controller/user/authController")


router.get("/pageNotFound",userController.pageNotFound)
router.get("/signup",authController.loadSignup)
router.post("/signup",authController.signup)
router.get("/",userController.loadHomepage)
router.post("/verifyOtp",authController.verifyOtp)
router.post("/resendOtp", authController.resendOtp)
router.get("/login",authController.loadLogin)
router.post("/login",authController.login)
module.exports=router;