const Admin=require("../../model/adminSchema")
const mongoose=require("mongoose")
const bcrypt=require("bcrypt")

const loadLogin=(req,res)=>{

    if(req.session.admin){
        return res.redirect("/admin/dashboard")
    }

    res.render("admin-login",{message:null})
}

const login =async(req,res)=>{
    try{
        const {email,password}=req.body
        const admin=await Admin.findOne({email})
        if(admin){
            const passwordMatch=bcrypt.compare(password,admin.password)
            if(passwordMatch){
                req.session.admin=true
                return res.redirect("/admin")
            }else{
                return res.redirect("/login")
            }
        }else{
            return res.redirect("/login")
        }
    }catch(error){
        console.log("login error",error)
        return res.redirect("/pageNotFound")
    }
}

const loadDashboard=async(req,res)=>{
    if(req.session.admin){
        try{
            res.render("dashboard")
        }catch(error){
            res.redirect("/pageNotFound")
        }
    }
}

module.exports={loadLogin,login,loadDashboard}