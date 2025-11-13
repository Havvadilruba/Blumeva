import express from "express";
import passport from "passport";
import * as middle from "../middlewares/userAuth.js";
import userController from "../controller/user/userController.js";
import authController from "../controller/user/authController.js";
import noCache from "../middlewares/noCache.js";
const router = express.Router();

router.use(middle.checkUser)
router.get("/pageNotFound",userController.pageNotFound)
router.get("/signup",noCache,authController.loadSignup)
router.post("/signup",authController.signup)
router.get("/",userController.loadLandingpage)
router.get("/verifyOtp",noCache, authController.loadVerifyOtp);
router.post("/verifyOtp",authController.verifyOtp)
router.post("/resendOtp", authController.resendOtp)
router.get("/login",noCache,authController.loadLogin)
router.post("/login",authController.login)
router.get("/logout",middle.userAuth, authController.logout);

router.get("/forgot-password",noCache, authController.loadForgotPassword);
router.post("/forgot-password", authController.sendResetOtp);
router.get("/verify-reset", noCache,authController.loadVerifyReset);
router.post("/verify-reset", authController.verifyResetOtp);
router.get("/reset-password",noCache, authController.loadResetPassword);
router.post("/reset-password", authController.saveNewPassword);

router.get("/auth/google",passport.authenticate("google",{scope:["profile","email"]}))
router.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:"/signup"}),authController.googleLogin)

router.get("/products",userController.listProducts);
router.get("/product/:id", userController.loadProductDetail);

export default router;
