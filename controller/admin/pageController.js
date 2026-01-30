import Orders from "../../model/orderSchema.js"

const getOrders =async(req,res)=>{
    try{
        const page =parseInt(req.query.page)||1
        const limit =10
        const skip=(page-1)*limit

        const totalOrders=await Orders.countDocuments()

        const orders=await Orders.find()
        .skip(skip)
        .limit(limit)

        const totalPages=Math.ceil(totalOrders/limit)

         res.render("admin/ordderss", {
      layout: "layouts/admin",
      title: "Orders | Admin",
      pageCSS: "",
      activePage: "orrdders",
      orders,
      currentPage: page,
      totalPages,
    });

    }catch(error){

    }
}

export default{
    getOrders
}