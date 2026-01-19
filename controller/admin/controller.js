import Coupon from "../../model/couponSchema.js"
import Order from "../../model/orderSchema.js"

const loadCoupon =async(req,res)=>{

    try{

        let query={
           orderStatus:"Delivered",
           paymentMethod:"razorpay",
           finalAmount:{$gt:1000,$lt:2000}

        }
        const coupons= await Order.find(query)


        res.render("admin/couponn",{
            layout: "layouts/admin",
    title: "",
    pageCSS: "",
     activePage: "coupons",
  
            coupons
        })

        }
    catch(error){

    }

}

export default{
    loadCoupon
}