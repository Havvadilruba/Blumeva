import express from "express";
import passport from "passport";
import * as middle from "../middlewares/userAuth.js";
import userController from "../controller/user/userController.js";
import authController from "../controller/user/authController.js";
import profileController from "../controller/user/profileController.js";
import addressController from "../controller/user/addressController.js";
import cartController from "../controller/user/cartController.js";
import checkoutController from "../controller/user/checkoutController.js";
import orderController from "../controller/user/orderController.js";
import noCache from "../middlewares/noCache.js";
import upload from "../middlewares/multer.js"; 

const router = express.Router();
console.log("User router loaded");
router.use(middle.checkUser)
console.log("After checkUser");      



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

router.get("/profile",profileController.loadProfile)
router.get("/profileEdit", middle.userAuth,profileController.loadEditProfile);
router.patch("/profileEdit", middle.userAuth,upload.single("profileImage"), profileController.updateProfile);
router.get("/emailEdit", middle.userAuth,profileController.loadEditEmail);
router.post("/send-email-otp", middle.userAuth, profileController.editEmail);
router.get("/email-verify", middle.userAuth, profileController.loadEmailVerify);
router.post("/email-verify", middle.userAuth, profileController.verifyEmailOtp);
router.post("/resend-email-otp", middle.userAuth, profileController.resendEmailOtp);

router.get("/change-password", middle.userAuth, profileController.loadChangePassword);
router.post("/change-password", middle.userAuth, profileController.updatePassword);

router.get("/manage-address", middle.userAuth, addressController.loadManageAddress);
router.post("/address", middle.userAuth, addressController.addAddress);
router.patch("/address/:id", middle.userAuth, addressController.updateAddress);
router.delete("/address/:id", middle.userAuth, addressController.deleteAddress);
router.patch("/address/set-default/:id", middle.userAuth, addressController.setDefaultAddress);


router.post("/cart/add", middle.userAuth, cartController.addToCart);
router.get("/cart", middle.userAuth, cartController.loadCart);
router.patch("/cart/update/:id",middle.userAuth, cartController.updateCartItem);
router.delete("/cart/delete/:id", middle.userAuth, cartController.deleteCartItem);

console.log("Checkout route hit");
router.get("/checkout", checkoutController.loadCheckout);

router.post("/order/place", middle.userAuth, orderController.placeOrder);
router.get("/order/success/:orderId", middle.userAuth, orderController.loadOrderSuccess);
router.get("/orders", orderController.loadOrders);


router.get("/orders/:id", middle.userAuth,orderController.loadOrderDetail);
router.post("/orders/:id/cancel-items", middle.userAuth, orderController.cancelOrderItems);

// Request return for an item
router.post("/orders/:id/return-item", middle.userAuth, orderController.requestReturn);

// Download invoice (PDF)
router.get("/orders/:id/invoice", middle.userAuth, orderController.downloadInvoice);

export default router;
