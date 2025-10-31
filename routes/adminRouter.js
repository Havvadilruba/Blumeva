const express=require("express")
const router=express.Router()
const authController=require("../controller/admin/authController")

router.get("/login",authController.loadLogin);
router.post("/login",authController.login)
router.get("/",authController.loadDashboard)

module.exports=router